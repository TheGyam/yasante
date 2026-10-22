import { addDays, startOfDay } from 'date-fns';
import { Linking, Platform } from 'react-native';
import { askPermission } from '@/shared/lib/push';
import { confirm } from '@/shared/ui/dialog';
import { nextDue } from './format';
import type { CarePlan, TimeOfDay } from './types';

// expo-notifications needs a development build; in Expo Go it's absent.
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

/** Her local time for each part of the day. */
export const REMINDER_TIMES: Record<TimeOfDay, [hour: number, minute: number]> = {
  morning: [8, 0],
  afternoon: [13, 0],
  evening: [19, 0],
  night: [21, 30],
};

/** "8:00", "21:30": when that part of her day's reminder comes. */
export const reminderAt = (timeOfDay: TimeOfDay) => {
  const [hour, minute] = REMINDER_TIMES[timeOfDay] ?? REMINDER_TIMES.evening;
  return `${hour}:${String(minute).padStart(2, '0')}`;
};

const PREFIX = 'care-plan:';
// iOS keeps at most 64 waiting; some room is left for anything else.
const MOST = 60;
const DAYS_AHEAD = 14;

type Remindable = Pick<
  CarePlan,
  'id' | 'name' | 'frequency' | 'specificDays' | 'timeOfDay' | 'remindersOn' | 'lastDoneAt'
>;

/**
 * When to remind her, soonest first: every day it's due over the next two weeks, at
 * her time of day, from when it's next due (today if it's late, and not today if it's
 * done). The app sets them again each time it opens or a plan changes, so they never
 * run out while she uses it.
 */
export function reminderTimes(plans: Remindable[], now = new Date()) {
  const times: { plan: Remindable; at: Date }[] = [];
  for (const plan of plans) {
    if (!plan.remindersOn) continue;
    const [hour, minute] = REMINDER_TIMES[plan.timeOfDay] ?? REMINDER_TIMES.evening;
    const today = startOfDay(now);
    let day = nextDue(plan, now);
    if (day < today) day = today;
    const days = plan.specificDays ?? [];
    const gap = plan.frequency === 'every-2-days' ? 2 : plan.frequency === 'weekly' ? 7 : 1;
    for (; day <= addDays(today, DAYS_AHEAD); day = addDays(day, gap)) {
      if (plan.frequency === 'specific-days' && !days.includes(day.getDay())) continue;
      const at = new Date(day);
      at.setHours(hour, minute, 0, 0);
      if (at > now) times.push({ plan, at });
    }
  }
  return times.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MOST);
}

let running: Promise<void> = Promise.resolve();

/**
 * Replace this phone's care plan reminders with the ones her plans ask for now. Pass
 * nothing to clear them (signing out). Quietly does nothing without permission.
 */
export function syncReminders(plans: Remindable[] = []) {
  // One at a time: two overlapping runs would each add a full set.
  running = running.then(() => sync(plans)).catch(() => {});
  return running;
}

async function sync(plans: Remindable[]) {
  if (!Notifications || Platform.OS === 'web') return;
  const api = Notifications;
  const waiting = await api.getAllScheduledNotificationsAsync();
  await Promise.all(
    waiting
      .filter(request => request.identifier.startsWith(PREFIX))
      .map(request => api.cancelScheduledNotificationAsync(request.identifier))
  );
  const wanted = reminderTimes(plans);
  if (!wanted.length) return;
  if ((await api.getPermissionsAsync()).status !== 'granted') return;
  for (const { plan, at } of wanted) {
    await api.scheduleNotificationAsync({
      identifier: `${PREFIX}${plan.id}:${at.getTime()}`,
      content: {
        title: plan.name,
        body: 'It’s time. Tap “I did this today” when you’re done.',
        data: { url: `/care-plans/${plan.id}`, mode: 'client' },
        sound: true,
      },
      trigger: { type: api.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

/**
 * Before "Remind me" goes on: notifications allowed, asking if it still can, or the way
 * to Settings if she said no before. False leaves the switch off.
 */
export async function ensureReminderPermission() {
  if (!Notifications || Platform.OS === 'web') return false;
  if ((await Notifications.getPermissionsAsync()).status === 'granted') return true;
  if (await askPermission()) return true;
  const open = await confirm({
    title: 'Turn on notifications',
    message: 'Yasante can only remind you when notifications are on for it in Settings.',
    confirmLabel: 'Open Settings',
  });
  if (open) Linking.openSettings().catch(() => {});
  return false;
}
