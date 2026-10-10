import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { format } from 'date-fns';
import { CalendarOff, X } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  DEFAULT_AVAILABILITY,
  DEFAULT_NOTICE_HOURS,
  NOTICE_CHOICES,
  hoursLabel,
  useMyStylistProfile,
  useUpdateStylistProfile,
  type Availability,
} from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { notify } from '@/shared/ui/dialog';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { dayKey, MonthCalendar } from '@/shared/ui/MonthCalendar';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';

// Monday first, the way she thinks about a week.
const DAYS = [
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
  { index: 0, name: 'Sunday' },
];

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  hours: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { paddingTop: space.lg },
}));

const toDate = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
const toTime = (date: Date) => format(date, 'HH:mm');

/**
 * When she works. Clients can only ask for days she's open, so her inbox fills
 * with requests she can actually say yes to.
 */
export default function AvailabilityScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data: profile, isLoading } = useMyStylistProfile();
  const update = useUpdateStylistProfile();
  const [draft, setDraft] = useState<Availability>(DEFAULT_AVAILABILITY);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    if (profile?.availability) setDraft(profile.availability);
  }, [profile?.availability]);

  const setDay = (index: number, hours: Availability['week'][number]) =>
    setDraft(current => {
      const week = [...current.week] as Availability['week'];
      week[index] = hours;
      return { ...current, week };
    });

  const toggleBlocked = (day: Date) => {
    const key = dayKey(day);
    haptics.selection();
    setDraft(current => ({
      ...current,
      blocked: current.blocked.includes(key)
        ? current.blocked.filter(d => d !== key)
        : [...current.blocked, key].sort(),
    }));
  };

  const save = async () => {
    try {
      await update.mutateAsync({ availability: draft });
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t save your hours',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  if (isLoading) {
    return (
      <Screen title="Working hours" modal testID="availability">
        <Skeleton height={320} />
      </Screen>
    );
  }

  const upcoming = draft.blocked.filter(d => d >= dayKey(new Date()));

  return (
    <Screen title="Working hours" modal testID="availability">
      <View style={styles.body}>
        <Text variant="body" tone="secondary">
          {hoursLabel(draft)}. Clients only see the days you’re open when they ask for a date.
        </Text>

        <Section title="Your week">
          {DAYS.map(({ index, name }) => {
            const hours = draft.week[index];
            return (
              <View key={index}>
                <ListRow
                  title={name}
                  subtitle={hours ? undefined : 'Closed'}
                  trailing={
                    <Toggle
                      value={!!hours}
                      onValueChange={on =>
                        setDay(index, on ? { start: '09:00', end: '18:00' } : null)
                      }
                      accessibilityLabel={`Open on ${name}`}
                    />
                  }
                />
                {hours && (
                  <View style={styles.hours}>
                    <View style={styles.half}>
                      <DateTimeField
                        title="From"
                        mode="time"
                        value={toDate(hours.start)}
                        onChange={d => setDay(index, { ...hours, start: toTime(d) })}
                      />
                    </View>
                    <View style={styles.half}>
                      <DateTimeField
                        title="Until"
                        mode="time"
                        value={toDate(hours.end)}
                        onChange={d => setDay(index, { ...hours, end: toTime(d) })}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </Section>

        <View style={{ gap: space.sm }}>
          <Text variant="overline" tone="tertiary">
            Notice you need
          </Text>
          <View style={styles.chips}>
            {NOTICE_CHOICES.map(choice => (
              <Chip
                key={choice.hours}
                label={choice.label}
                selected={(draft.leadHours ?? DEFAULT_NOTICE_HOURS) === choice.hours}
                onPress={() => setDraft(current => ({ ...current, leadHours: choice.hours }))}
              />
            ))}
          </View>
          <Text variant="footnote" tone="secondary">
            Clients only see times at least this far ahead. A request you haven’t answered lapses 2
            hours before its time.
          </Text>
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="overline" tone="tertiary">
            Days off
          </Text>
          <Text variant="footnote" tone="secondary">
            Tap a day to block it — a holiday, a family day. Tap it again to open it.
          </Text>
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            selected={null}
            onSelect={toggleBlocked}
            marked={new Set(draft.blocked)}
          />
          {upcoming.length > 0 && (
            <Section>
              {upcoming.map(day => (
                <ListRow
                  key={day}
                  title={format(new Date(`${day}T12:00:00`), 'EEEE d MMMM')}
                  icon={CalendarOff}
                  iconTone="neutral"
                  trailing={
                    <IconButton
                      icon={X}
                      variant="plain"
                      size={32}
                      accessibilityLabel={`Open ${day} again`}
                      onPress={() => toggleBlocked(new Date(`${day}T12:00:00`))}
                    />
                  }
                />
              ))}
            </Section>
          )}
        </View>

        <View style={styles.footer}>
          <Button
            label="Save"
            onPress={save}
            loading={update.isPending}
            fullWidth
            testID="availability-save"
          />
        </View>
      </View>
    </Screen>
  );
}
