import { Share } from 'react-native';
import { formatMoney } from '@/shared/lib/format';
import type {
  Availability,
  MenuItem,
  OptionGroup,
  PriceOption,
  StylistProfile,
  VerificationTier,
} from './types';
import { track } from '@/shared/lib/analytics';

export const PUBLIC_HOST = 'yasante.com';

/** Her link-in-bio. The whole growth model runs through this address. */
export const pageUrl = (profile: Pick<StylistProfile, 'handle'>) =>
  `https://${PUBLIC_HOST}/${profile.handle}`;

/** "Usually replies within an hour" — rounded the way a person would say it. */
export function replyLabel(hours?: number) {
  if (hours === undefined) return undefined;
  if (hours <= 1) return 'Usually replies within an hour';
  if (hours <= 6) return 'Usually replies within a few hours';
  if (hours <= 24) return 'Usually replies within a day';
  return 'Usually replies within two days';
}

const TIMING_WORDS = { early: 'finishes early', on_time: 'finishes on time', over: 'runs over' };

/** "Usually finishes on time · 8 of 10 appointments". The sample size is always shown. */
export function timingLabelText(label?: {
  outcome: keyof typeof TIMING_WORDS;
  count: number;
  sample: number;
}) {
  if (!label) return undefined;
  return `Usually ${TIMING_WORDS[label.outcome]} · ${label.count} of ${label.sample} appointments`;
}

/** Every badge says exactly what was checked — never a generic "verified". */
export const VERIFICATION_LABELS: Record<VerificationTier, string> = {
  0: 'Not checked yet',
  1: 'Phone and work checked',
  2: 'Met by Yasante',
};

/** "4 hrs", "3 hrs 30 mins", "45 mins" — how she says it, not 210. */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} mins`;
  const spoken = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  return rest ? `${spoken} ${rest} mins` : spoken;
}

/** "£120" or "from £120". Never a range: the low end plus "from" is what clients read. */
export function formatPrice(item: Pick<MenuItem, 'price' | 'fromPrice'>) {
  return item.fromPrice ? `from ${formatMoney(item.price)}` : formatMoney(item.price);
}

export function sharePage(profile: Pick<StylistProfile, 'handle' | 'displayName'>) {
  const url = pageUrl(profile);
  track('share_link', { kind: 'stylist_page' });
  return Share.share({ message: `${profile.displayName} on Yasante: ${url}`, url }).catch(() => {});
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** A sensible start: Tuesday to Saturday, nine to six. */
export const DEFAULT_AVAILABILITY: Availability = {
  week: [
    null,
    null,
    { start: '09:00', end: '18:00' },
    { start: '09:00', end: '18:00' },
    { start: '09:00', end: '18:00' },
    { start: '09:00', end: '18:00' },
    { start: '09:00', end: '18:00' },
  ],
  blocked: [],
};

/** Whether she works that day. No availability set means she hasn't said, so yes. */
export function isOpenOn(availability: Availability | undefined, date: Date) {
  if (!availability) return true;
  if (availability.blocked.includes(ymd(date))) return false;
  return !!availability.week[date.getDay()];
}

/** Why a day doesn't work, in her words — for the client picking one. */
export function closedReason(availability: Availability | undefined, date: Date) {
  if (isOpenOn(availability, date)) return undefined;
  return availability!.blocked.includes(ymd(date))
    ? 'She’s away that day'
    : `She doesn’t work ${DAY_NAMES[date.getDay()]}s`;
}

/** "Tue–Sat, 09:00–18:00" or "Mon, Wed, Fri" — how her week reads at a glance. */
export function hoursLabel(availability?: Availability) {
  if (!availability) return undefined;
  // Monday first, the way people say a week.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const open = order.filter(d => availability.week[d]);
  if (!open.length) return 'Not taking bookings at the moment';
  const runs: number[][] = [];
  for (const day of open) {
    const run = runs[runs.length - 1];
    if (run && order.indexOf(day) === order.indexOf(run[run.length - 1]) + 1) run.push(day);
    else runs.push([day]);
  }
  const days = runs
    .map(r =>
      r.length > 2
        ? `${DAY_NAMES[r[0]]}–${DAY_NAMES[r[r.length - 1]]}`
        : r.map(d => DAY_NAMES[d]).join(', ')
    )
    .join(', ');
  const hours = open.map(d => availability.week[d]!);
  const same = hours.every(h => h.start === hours[0].start && h.end === hours[0].end);
  return same ? `${days}, ${hours[0].start}–${hours[0].end}` : days;
}

/** The next day she works, from tomorrow, within the next two months. */
export function nextOpenDay(availability: Availability | undefined, from = new Date(), skip = 0) {
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  let found = 0;
  for (let i = 1; i <= 62; i++) {
    day.setDate(day.getDate() + 1);
    if (isOpenOn(availability, day) && found++ === skip) return new Date(day);
  }
  return undefined;
}

export const OPTION_GROUPS: { group: OptionGroup; name: string }[] = [
  { group: 'length', name: 'Length' },
  { group: 'size', name: 'Size' },
];

/** The groups a service is priced by, each with its choices in order. */
export function optionGroups(item: Pick<MenuItem, 'options'>) {
  return OPTION_GROUPS.map(({ group, name }) => ({
    group,
    name,
    choices: (item.options ?? []).filter(o => o.group === group),
  })).filter(g => g.choices.length > 0);
}

export type ChosenOptions = Partial<Record<OptionGroup, string>>;

/**
 * What it comes to with her choices: the base, plus each chosen option. Exact
 * once every group is chosen; a starting price until then.
 */
export function estimate(item: MenuItem, chosen: ChosenOptions = {}) {
  const groups = optionGroups(item);
  const picked = groups
    .map(g => g.choices.find(c => c.id === chosen[g.group]))
    .filter((o): o is PriceOption => !!o);
  const complete = picked.length === groups.length;
  return {
    price: item.price + picked.reduce((sum, o) => sum + o.add, 0),
    minutes: item.durationMinutes
      ? item.durationMinutes + picked.reduce((sum, o) => sum + (o.addMinutes ?? 0), 0)
      : undefined,
    labels: picked.map(o => o.label),
    // With options she's chosen from her own price list, it's her quote — not a "from".
    fromPrice: groups.length ? !complete : item.fromPrice,
    complete,
  };
}

/** Typical London braid pricing, to start her off — she changes every number. */
export const TYPICAL_OPTIONS: Omit<PriceOption, 'id'>[] = [
  { group: 'length', label: 'Shoulder', add: 0 },
  { group: 'length', label: 'Mid-back', add: 20, addMinutes: 60 },
  { group: 'length', label: 'Waist', add: 40, addMinutes: 120 },
  { group: 'size', label: 'Large', add: 0 },
  { group: 'size', label: 'Medium', add: 20, addMinutes: 60 },
  { group: 'size', label: 'Small', add: 40, addMinutes: 120 },
];
