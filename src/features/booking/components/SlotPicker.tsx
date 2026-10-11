import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { format } from 'date-fns';
import { BellRing, CalendarHeart, ChevronLeft, ChevronRight, Sun, Zap } from 'lucide-react-native';
import { hoursOn, type Availability } from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { zoneLabel, zoneMark } from '@/shared/lib/timeZone';
import { GUTTER, fonts, makeStyles, radius, space, timing, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { Glass } from '@/shared/ui/Glass';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { dayLabel, salonTime } from '../format';
import { useFreeSlots, useWatchSlots } from '../hooks';
import {
  atNoon,
  dayKey,
  daysBefore,
  monthOf,
  monthSpan,
  monthWeeks,
  passes,
  reachableMonths,
  readyBy,
  roomOn,
  shiftDay,
  shiftMonth,
  type DayFilter,
} from '../picker';
import type { SlotQuery } from '../types';

/** Points per minute on the day's timeline: a ten-hour day is 360 tall. */
const SCALE = 0.6;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FILTERS: { value: DayFilter; label: string }[] = [
  { value: 'any', label: 'Any day' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekdays', label: 'Weekdays' },
];
// When the day is split, so a long list of times reads at a glance.
const PARTS = [
  { name: 'Morning', until: 12 },
  { name: 'Afternoon', until: 17 },
  { name: 'Evening', until: 24 },
];

const useStyles = makeStyles(t => ({
  body: { gap: space.lg },
  ideas: { marginHorizontal: -GUTTER },
  ideasRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: GUTTER },
  idea: {
    width: 128,
    minHeight: 92,
    padding: space.md,
    gap: 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
    backgroundColor: t.colors.glass.fill,
  },
  ideaOn: { borderColor: t.colors.accent, backgroundColor: t.colors.accentSoft },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  card: { padding: space.md, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { flexDirection: 'row' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  week: { flexDirection: 'row' },
  cell: { flex: 1, padding: 2 },
  day: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayOpen: { backgroundColor: t.colors.glass.fill, borderColor: t.colors.glass.border },
  dayOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  dayEvent: { borderColor: t.colors.gold, borderWidth: 1.5 },
  dayBefore: { borderColor: t.colors.accent, borderStyle: 'dashed', borderWidth: 1.5 },
  number: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: t.colors.text.primary },
  numberFaint: { color: t.colors.text.tertiary, opacity: 0.6 },
  numberOn: { color: t.colors.text.onAccent, fontFamily: fonts.semibold },
  numberEvent: { color: t.colors.gold, fontFamily: fonts.semibold },
  bar: { height: 4, borderRadius: 2 },
  banner: {
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.lg,
    backgroundColor: t.colors.accentSoft,
  },
  timeline: { flexDirection: 'row', gap: space.sm },
  hours: { width: 40 },
  track: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    overflow: 'hidden',
  },
  hourLabel: { position: 'absolute', right: 0 },
  line: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: t.colors.separator },
  block: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    backgroundColor: t.colors.glass.fillStrong,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors.glass.highlight,
    overflow: 'hidden',
  },
  mine: { backgroundColor: t.colors.warningSoft, borderColor: t.colors.gold },
  you: {
    position: 'absolute',
    top: 0,
    left: space.sm,
    right: space.sm,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    backgroundColor: t.colors.accent,
    // One line, so even an hour's job shows when it ends.
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: space.sm,
    overflow: 'hidden',
  },
  part: { gap: space.sm },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dim: { opacity: 0.6 },
  off: { opacity: 0.3 },
}));

const toMinutes = (clock: string) => {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
};
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export interface SlotPickerProps {
  /** Whose times, for which job (or which appointment being moved). */
  query: SlotQuery;
  /** Whom to be told about when a time opens; without it, no such offer. */
  stylistId?: string;
  stylistName: string;
  /** Her week: the day's hours on the timeline. */
  availability?: Availability;
  /** Her zone, before the first answer says it. */
  timeZone?: string;
  /** The chosen start time, as ISO. */
  value?: string;
  onChange: (iso: string | undefined) => void;
  /** A day to open on, yyyy-MM-dd: a slot someone was told about. */
  initialDay?: string;
}

/**
 * Choosing a time, the way a person plans one: ideas first (her soonest, a weekend, or
 * ready for a date that matters), then a month that shows at a glance how much room
 * each day has, then the day itself drawn as a timeline with the appointment on it, so
 * when it finishes is as plain as when it starts. Only real openings are offered, and
 * the server checks the one picked again as it's sent.
 */
export function SlotPicker({
  query,
  stylistId,
  stylistName,
  availability,
  timeZone,
  value,
  onChange,
  initialDay,
}: SlotPickerProps) {
  const styles = useStyles();
  const theme = useTheme();
  // Today on her calendar, as of when the picker opened.
  const [today] = useState(() => dayKey(salonTime(new Date(), timeZone)));
  const startDay = value ? dayKey(salonTime(value, timeZone)) : initialDay;
  const [month, setMonth] = useState(() => monthOf(startDay ?? today));
  const [picked, setPicked] = useState(startDay);
  const [filter, setFilter] = useState<DayFilter>('any');
  const [event, setEvent] = useState<string>();
  const [choosingEvent, setChoosingEvent] = useState(false);
  // What she's asked to be told about, so the button says it's done.
  const [told, setTold] = useState<string[]>([]);
  const watch = useWatchSlots();

  const span = monthSpan(month);
  const slots = useFreeSlots(query, span.from, span.to);
  const data = slots.data;
  const zone = data?.timeZone ?? timeZone;
  const reach = reachableMonths(today, data?.lastDate);
  const lastMonth = reach[reach.length - 1];
  // The next month, asked for now, so turning the page is instant.
  const next = monthSpan(shiftMonth(month, 1));
  useFreeSlots(query, next.from, next.to, month < lastMonth);
  // The days before an occasion can sit in another month.
  const around = useFreeSlots(
    query,
    event && shiftDay(event, -daysBefore(event).length),
    event && shiftDay(event, -1),
    !!event
  );
  const best = event ? readyBy(event, around.data) : undefined;
  const ringed = new Set(event ? daysBefore(event) : []);

  const choose = (iso: string) => {
    const day = dayKey(salonTime(iso, zone));
    haptics.selection();
    setMonth(monthOf(day));
    setPicked(day);
    onChange(iso);
  };

  const ask = async (key: string, from: string, to: string) => {
    if (!stylistId) return;
    try {
      // Noon UTC is the same date on her calendar, wherever she is.
      await watch.mutateAsync({
        stylistId,
        from: `${from}T12:00:00.000Z`,
        to: `${to}T12:00:00.000Z`,
      });
      haptics.success();
      setTold(current => [...current, key]);
    } catch {
      haptics.error();
    }
  };

  const onDay = (day: string) => {
    if (choosingEvent) {
      haptics.selection();
      setEvent(day);
      setChoosingEvent(false);
      return;
    }
    if (day === picked) return;
    haptics.selection();
    setPicked(day);
    // A time belongs to its day: another day starts without one.
    if (value) onChange(undefined);
  };

  if (!data) {
    return (
      <View style={styles.body}>
        <View style={styles.ideasRow}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} width={128} height={92} radius={radius.lg} />
          ))}
        </View>
        <Skeleton height={320} radius={radius.lg} />
      </View>
    );
  }

  const ideas = [
    { key: 'soonest', title: 'Soonest', icon: Zap, at: data.soonest },
    { key: 'weekend', title: 'A weekend', icon: Sun, at: data.weekend },
  ];
  const lastDate = data.lastDate;
  const nothingFree = !data.soonest;

  return (
    <View style={styles.body}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.ideas}
        contentContainerStyle={styles.ideasRow}
      >
        {ideas.map(idea => {
          const on = !!idea.at && idea.at === value;
          return (
            <PressableScale
              key={idea.key}
              style={[styles.idea, on && styles.ideaOn]}
              disabled={!idea.at}
              onPress={() => idea.at && choose(idea.at)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !idea.at }}
              accessibilityLabel={`${idea.title}: ${idea.at ? `${dayLabel(idea.at, zone)}, ${format(salonTime(idea.at, zone), 'HH:mm')}` : 'nothing free'}`}
            >
              <idea.icon size={18} color={theme.colors.accent} strokeWidth={2.2} />
              <Text variant="overline" tone="tertiary" style={{ marginTop: space.xs }}>
                {idea.title}
              </Text>
              <Text variant="callout">{idea.at ? dayLabel(idea.at, zone) : 'Nothing free'}</Text>
              {!!idea.at && (
                <Text variant="footnote" tone="secondary">
                  {format(salonTime(idea.at, zone), 'HH:mm')}
                </Text>
              )}
            </PressableScale>
          );
        })}
        <PressableScale
          style={[styles.idea, (choosingEvent || !!event) && styles.ideaOn]}
          onPress={() => {
            haptics.selection();
            if (event) setEvent(undefined);
            else setChoosingEvent(on => !on);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: choosingEvent || !!event }}
          accessibilityLabel={
            event
              ? `Ready by ${format(atNoon(event), 'EEEE d MMMM')}. Tap to clear`
              : 'Ready by a date: pick the day you need your hair done for'
          }
        >
          <CalendarHeart size={18} color={theme.colors.gold} strokeWidth={2.2} />
          <Text variant="overline" tone="tertiary" style={{ marginTop: space.xs }}>
            Ready by
          </Text>
          <Text variant="callout">
            {event
              ? format(atNoon(event), 'EEE d MMM')
              : choosingEvent
                ? 'Tap your day'
                : 'A date?'}
          </Text>
          <Text variant="footnote" tone="secondary">
            {event ? 'Your day' : 'For an occasion'}
          </Text>
        </PressableScale>
      </ScrollView>

      {choosingEvent && (
        <Text variant="footnote" tone="secondary">
          Tap the day you need it done for: a wedding, a holiday, a birthday.
        </Text>
      )}
      {!!event && (
        <Animated.View entering={FadeIn.duration(180)} style={styles.hint}>
          <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
            {best
              ? `Best fit: ${format(atNoon(best.day), 'EEEE d MMM')} at ${format(salonTime(best.time, zone), 'HH:mm')}. The days just before yours are ringed.`
              : around.isLoading
                ? 'Looking at the days before it…'
                : `Nothing free in the ${daysBefore(event).length} days before it. Pick a day further ahead, or another date.`}
          </Text>
          {!!best && best.time !== value && (
            <Button
              label="Take it"
              size="sm"
              variant="secondary"
              onPress={() => choose(best.time)}
            />
          )}
        </Animated.View>
      )}

      <Glass style={[styles.card, slots.isPlaceholderData && styles.dim]}>
        <View style={styles.header}>
          <Text variant="title3" accessibilityRole="header" style={{ paddingLeft: space.sm }}>
            {format(atNoon(`${month}-01`), 'MMMM yyyy')}
          </Text>
          <View style={styles.nav}>
            <IconButton
              icon={ChevronLeft}
              variant="plain"
              size={40}
              accessibilityLabel="Previous month"
              disabled={month <= reach[0]}
              style={month <= reach[0] && styles.off}
              onPress={() => {
                haptics.selection();
                setMonth(shiftMonth(month, -1));
              }}
            />
            <IconButton
              icon={ChevronRight}
              variant="plain"
              size={40}
              accessibilityLabel="Next month"
              disabled={month >= lastMonth}
              style={month >= lastMonth && styles.off}
              onPress={() => {
                haptics.selection();
                setMonth(shiftMonth(month, 1));
              }}
            />
          </View>
        </View>

        <View style={styles.filters}>
          {FILTERS.map(f => (
            <Chip
              key={f.value}
              label={f.label}
              selected={filter === f.value}
              onPress={() => setFilter(f.value)}
            />
          ))}
        </View>

        <View style={styles.week}>
          {WEEKDAYS.map((label, i) => (
            <View key={i} style={[styles.cell, { alignItems: 'center' }]}>
              <Text variant="caption" tone="tertiary">
                {label}
              </Text>
            </View>
          ))}
        </View>

        {monthWeeks(month).map(week => (
          <View key={week.find(Boolean)} style={styles.week}>
            {week.map((day, i) => {
              if (!day) return <View key={i} style={styles.cell} />;
              const room = passes(day, filter) ? roomOn(day, data) : 'none';
              const on = day === picked && !choosingEvent;
              const open = room === 'plenty' || room === 'few';
              const tappable = choosingEvent ? day > today : open || room === 'full';
              const words = {
                plenty: 'plenty of times',
                few: 'a few times left',
                full: 'fully booked',
                away: 'away',
                none: lastDate && day > lastDate ? 'not open for booking yet' : 'no times',
              }[room];
              return (
                <Pressable
                  key={day}
                  style={styles.cell}
                  disabled={!tappable}
                  onPress={() => onDay(day)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: !tappable }}
                  accessibilityLabel={`${format(atNoon(day), 'EEEE d MMMM')}, ${words}${day === event ? ', your day' : ''}`}
                >
                  <View
                    style={[
                      styles.day,
                      open && styles.dayOpen,
                      on && styles.dayOn,
                      ringed.has(day) && !on && styles.dayBefore,
                      day === event && styles.dayEvent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.number,
                        !open && styles.numberFaint,
                        day === event && styles.numberEvent,
                        on && styles.numberOn,
                      ]}
                      maxFontSizeMultiplier={1.2}
                    >
                      {Number(day.slice(8))}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: room === 'plenty' ? 18 : room === 'few' ? 6 : 0,
                          backgroundColor: on
                            ? theme.colors.text.onAccent
                            : room === 'few'
                              ? theme.colors.gold
                              : theme.colors.accent,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Text variant="caption" tone="tertiary" style={{ paddingLeft: space.sm }}>
          A long bar is plenty of times, a short one a few left.
        </Text>
      </Glass>

      {nothingFree && (
        <View style={styles.banner}>
          <Text variant="callout">{stylistName} is fully booked for now.</Text>
          {!!stylistId && (
            <Button
              label={
                told.includes('any') ? 'We’ll tell you if a time opens' : 'Tell me if a time opens'
              }
              icon={BellRing}
              variant="secondary"
              disabled={told.includes('any')}
              loading={watch.isPending}
              onPress={() => ask('any', today, lastDate ?? shiftDay(today, 83))}
            />
          )}
        </View>
      )}
      {!nothingFree && month === lastMonth && !!lastDate && (
        <View style={styles.banner}>
          <Text variant="callout">
            {stylistName} takes bookings up to {format(atNoon(lastDate), 'EEEE d MMMM')}. One more
            day opens each morning.
          </Text>
          {!!stylistId && (
            <Button
              label={
                told.includes('later')
                  ? 'We’ll tell you when it opens'
                  : `Tell me when ${format(atNoon(shiftDay(lastDate, 1)), 'MMMM')} opens`
              }
              icon={BellRing}
              variant="secondary"
              disabled={told.includes('later')}
              loading={watch.isPending}
              onPress={() => ask('later', shiftDay(lastDate, 1), shiftDay(lastDate, 31))}
            />
          )}
        </View>
      )}

      {!!picked && !choosingEvent && (
        <Day
          key={picked}
          day={picked}
          slots={data}
          zone={zone}
          availability={availability}
          value={value}
          onChange={iso => {
            haptics.selection();
            onChange(iso);
          }}
          full={roomOn(picked, data) === 'full'}
          toldFree={told.includes(picked)}
          asking={watch.isPending}
          onAskFree={stylistId ? () => ask(picked, picked, picked) : undefined}
        />
      )}
    </View>
  );
}

interface DayProps {
  day: string;
  slots: NonNullable<ReturnType<typeof useFreeSlots>['data']>;
  zone?: string;
  availability?: Availability;
  value?: string;
  onChange: (iso: string) => void;
  full: boolean;
  toldFree: boolean;
  asking: boolean;
  onAskFree?: () => void;
}

/** The day drawn out: her hours, what's booked, and the appointment where it'd sit. */
function Day({
  day,
  slots,
  zone,
  availability,
  value,
  onChange,
  full,
  toldFree,
  asking,
  onAskFree,
}: DayProps) {
  const styles = useStyles();
  const theme = useTheme();
  const free = slots.days.find(d => d.date === day);
  const times = useMemo(() => free?.times ?? [], [free]);
  const busy = free?.busy ?? [];
  const minutes = slots.minutes;
  const at = (iso: string) => {
    const t = salonTime(iso, zone);
    return t.getHours() * 60 + t.getMinutes();
  };

  // Her hours that day, stretched to anything that runs past them.
  const hours = hoursOn(availability, atNoon(day));
  const starts = times.map(at);
  let open = hours ? toMinutes(hours.start) : Math.min(...starts, 9 * 60);
  let close = hours ? toMinutes(hours.end) : Math.max(...starts.map(s => s + minutes), 18 * 60);
  for (const b of busy) {
    open = Math.min(open, at(b.start));
    close = Math.max(close, at(b.end) || 24 * 60);
  }
  if (starts.length) close = Math.max(close, starts[starts.length - 1] + minutes);
  open = Math.floor(open / 60) * 60;
  close = Math.ceil(close / 60) * 60;
  const height = (close - open) * SCALE;

  const chosen = value && times.includes(value) ? at(value) : undefined;
  const youY = useSharedValue(-1);
  useEffect(() => {
    if (chosen === undefined) return;
    const y = (chosen - open) * SCALE;
    // Placed the first time; after that it glides to the new start.
    youY.set(youY.get() < 0 ? y : withTiming(y, timing.move));
  }, [chosen, open, youY]);
  const youStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(0, youY.get()) }],
  }));

  // A tap on the timeline starts the appointment at the nearest time free to there.
  const tapAt = (y: number) => {
    if (!times.length) return;
    const wanted = open + y / SCALE - minutes / 2;
    const nearest = times.reduce((a, b) =>
      Math.abs(at(b) - wanted) < Math.abs(at(a) - wanted) ? b : a
    );
    if (nearest !== value) onChange(nearest);
  };

  const title = format(atNoon(day), 'EEEE d MMMM');
  if (full || !times.length) {
    return (
      <Animated.View entering={FadeIn.duration(180)} style={styles.part}>
        <Text variant="title3">{title}</Text>
        <Text variant="subhead" tone="secondary">
          Fully booked.{onAskFree ? ' If a time frees up, you can be the first to know.' : ''}
        </Text>
        {!!onAskFree && (
          <Button
            label={toldFree ? 'We’ll tell you if one opens' : 'Tell me if a time opens'}
            icon={BellRing}
            variant="secondary"
            disabled={toldFree}
            loading={asking}
            onPress={onAskFree}
          />
        )}
      </Animated.View>
    );
  }

  const hourMarks = Array.from({ length: (close - open) / 60 + 1 }, (_, i) => open + i * 60);
  const summary = [
    chosen !== undefined
      ? `Your appointment ${clock(chosen)} to ${clock(chosen + minutes)}`
      : undefined,
    ...busy.map(b => `${b.mine ? 'Yours' : 'Booked'} ${clock(at(b.start))} to ${clock(at(b.end))}`),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.body}>
      <View style={{ gap: 2 }}>
        <Text variant="title3" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="footnote" tone="secondary">
          {hours ? `${hours.start}–${hours.end}` : 'Her hours'}
          {chosen !== undefined
            ? ` · You’d be there ${clock(chosen)} to ${clock(chosen + minutes)}`
            : ' · Tap a time, or a free part of the day'}
        </Text>
      </View>

      <View
        style={styles.timeline}
        accessible
        accessibilityLabel={summary || `${title}, nothing booked yet`}
      >
        <View style={[styles.hours, { height }]}>
          {hourMarks.map(m => (
            <Text
              key={m}
              variant="caption"
              tone="tertiary"
              style={[
                styles.hourLabel,
                { top: Math.min(Math.max(0, (m - open) * SCALE - 8), height - 16) },
              ]}
            >
              {clock(m)}
            </Text>
          ))}
        </View>
        <Pressable style={[styles.track, { height }]} onPress={e => tapAt(e.nativeEvent.locationY)}>
          {hourMarks.slice(1, -1).map(m => (
            <View key={m} style={[styles.line, { top: (m - open) * SCALE }]} />
          ))}
          {busy.map(b => {
            const from = Math.max(open, at(b.start));
            const to = Math.min(close, at(b.end) || 24 * 60);
            return (
              <View
                key={b.start}
                style={[
                  styles.block,
                  b.mine && styles.mine,
                  { top: (from - open) * SCALE + 2, height: Math.max(12, (to - from) * SCALE - 4) },
                ]}
              >
                <Text variant="caption" tone="secondary" numberOfLines={1}>
                  {b.mine ? 'Yours' : 'Booked'} {clock(from)}–{clock(to)}
                </Text>
              </View>
            );
          })}
          {chosen !== undefined && (
            <Animated.View
              pointerEvents="none"
              style={[styles.you, { height: Math.max(28, minutes * SCALE - 4) }, youStyle]}
            >
              <Text variant="callout" style={{ color: theme.colors.text.onAccent }}>
                You
              </Text>
              <Text variant="footnote" style={{ color: theme.colors.text.onAccent }}>
                {clock(chosen)} → {clock(chosen + minutes)}
              </Text>
            </Animated.View>
          )}
        </Pressable>
      </View>

      {PARTS.map((part, index) => {
        const from = index ? PARTS[index - 1].until : 0;
        const list = times.filter(t => {
          const hour = salonTime(t, zone).getHours();
          return hour >= from && hour < part.until;
        });
        if (!list.length) return null;
        return (
          <View key={part.name} style={styles.part}>
            <Text variant="overline" tone="tertiary">
              {part.name}
            </Text>
            <View style={styles.times}>
              {list.map(time => (
                <Chip
                  key={time}
                  label={format(salonTime(time, zone), 'HH:mm')}
                  selected={value === time}
                  onPress={() => onChange(time)}
                  accessibilityLabel={`${format(salonTime(time, zone), 'EEEE d MMMM, HH:mm')}${zoneMark(zone)}, until ${clock(at(time) + minutes)}`}
                />
              ))}
            </View>
          </View>
        );
      })}
      {!!zoneMark(zone) && (
        <Text variant="footnote" tone="tertiary">
          Times are in {zoneLabel(zone!)}, where the appointment is.
        </Text>
      )}
    </Animated.View>
  );
}
