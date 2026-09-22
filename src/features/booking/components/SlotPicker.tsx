import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { format, isToday, isTomorrow } from 'date-fns';
import { GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import type { FreeSlots } from '../types';

const useStyles = makeStyles(t => ({
  body: { gap: space.lg },
  strip: { marginHorizontal: -GUTTER },
  days: { flexDirection: 'row', gap: space.sm, paddingHorizontal: GUTTER },
  day: {
    width: 60,
    paddingVertical: space.sm,
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    backgroundColor: t.colors.glass.fill,
  },
  dayOn: { borderColor: t.colors.accent, backgroundColor: t.colors.accentSoft },
  part: { gap: space.sm },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  skeletons: { flexDirection: 'row', gap: space.sm },
  refreshing: { opacity: 0.6 },
}));

// When the day is split, so a long list of times reads at a glance.
const PARTS = [
  { name: 'Morning', until: 12 },
  { name: 'Afternoon', until: 17 },
  { name: 'Evening', until: 24 },
];

const dayOf = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

export interface SlotPickerProps {
  slots?: FreeSlots;
  loading?: boolean;
  /** Showing the last times while new ones load: dimmed, still tappable. */
  refreshing?: boolean;
  /** The chosen start time, as ISO. */
  value?: string;
  onChange: (iso: string) => void;
  /** A day to open on, yyyy-MM-dd — a slot someone was told about. */
  initialDay?: string;
  /** Shown when she has nothing free: a way to wait for a slot. */
  whenFull?: ReactNode;
}

/**
 * Her free times, the way a booking app shows them: the days she has room, then
 * the times on the day you pick. Only real openings, so whatever is picked is a
 * time she can actually do.
 */
export function SlotPicker({
  slots,
  loading,
  refreshing,
  value,
  onChange,
  initialDay,
  whenFull,
}: SlotPickerProps) {
  const styles = useStyles();
  const theme = useTheme();
  const days = useMemo(() => slots?.days ?? [], [slots]);
  const [picked, setPicked] = useState<string>();

  // Open on the day asked for, else the first with room; move off a day that filled up.
  useEffect(() => {
    if (!days.length) return;
    setPicked(current => {
      const wanted = current ?? (value ? dayOf(value) : initialDay);
      return days.some(d => d.date === wanted) ? wanted : days[0].date;
    });
  }, [days, value, initialDay]);

  if (loading) {
    return (
      <View style={styles.body}>
        <View style={styles.skeletons}>
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} width={60} height={64} radius={radius.md} />
          ))}
        </View>
        <Skeleton height={80} />
      </View>
    );
  }

  if (!days.length) {
    return (
      <View style={styles.body}>
        <Text variant="subhead" tone="secondary">
          She’s fully booked for the next four weeks.
        </Text>
        {whenFull}
      </View>
    );
  }

  const day = days.find(d => d.date === picked) ?? days[0];

  return (
    <View style={[styles.body, refreshing && styles.refreshing]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.days}
      >
        {days.map(({ date }) => {
          const at = new Date(`${date}T12:00:00`);
          const on = date === day.date;
          const color = on ? theme.colors.accent : theme.colors.text.primary;
          return (
            <PressableScale
              key={date}
              onPress={() => setPicked(date)}
              haptic="selection"
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={format(at, 'EEEE d MMMM')}
              style={[styles.day, on && styles.dayOn]}
            >
              <Text variant="caption" tone={on ? 'accent' : 'secondary'}>
                {isToday(at) ? 'Today' : isTomorrow(at) ? 'Tmrw' : format(at, 'EEE')}
              </Text>
              <Text variant="title3" style={{ color }}>
                {format(at, 'd')}
              </Text>
              <Text variant="caption" tone="tertiary">
                {format(at, 'MMM')}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {PARTS.map((part, index) => {
        const from = index ? PARTS[index - 1].until : 0;
        const times = day.times.filter(t => {
          const hour = new Date(t).getHours();
          return hour >= from && hour < part.until;
        });
        if (!times.length) return null;
        return (
          <View key={part.name} style={styles.part}>
            <Text variant="overline" tone="tertiary">
              {part.name}
            </Text>
            <View style={styles.times}>
              {times.map(time => (
                <Chip
                  key={time}
                  label={format(new Date(time), 'HH:mm')}
                  selected={value === time}
                  onPress={() => onChange(time)}
                  accessibilityLabel={format(new Date(time), 'EEEE d MMMM, HH:mm')}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
