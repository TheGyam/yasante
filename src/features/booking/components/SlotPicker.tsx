import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { format, isToday, isTomorrow } from 'date-fns';
import { GUTTER, makeStyles, radius, space, spring, useTheme } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { salonTime } from '../format';
import type { FreeSlots } from '../types';

/** A day's width, and the step the strip snaps to (the day plus its gap). */
const DAY_WIDTH = 60;
const DAY_STEP = DAY_WIDTH + space.sm;

const useStyles = makeStyles(t => ({
  body: { gap: space.lg },
  strip: { marginHorizontal: -GUTTER },
  days: { flexDirection: 'row', gap: space.sm, paddingHorizontal: GUTTER },
  day: {
    width: DAY_WIDTH,
    paddingVertical: space.sm,
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    backgroundColor: t.colors.glass.fill,
  },
  // The chosen day's colour is the pill sliding under it, so the day itself goes clear.
  dayOn: { borderColor: 'transparent', backgroundColor: 'transparent' },
  pill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: GUTTER,
    width: DAY_WIDTH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.colors.accent,
    backgroundColor: t.colors.accentSoft,
  },
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

const dayOf = (iso: string) => format(salonTime(iso), 'yyyy-MM-dd');

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
  // The highlight slides from day to day on the UI thread; a tap renders React once.
  const pillX = useSharedValue(-1);
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillX.get() < 0 ? 0 : 1,
    transform: [{ translateX: Math.max(0, pillX.get()) }],
  }));
  const pickedIndex = days.findIndex(d => d.date === picked);
  useEffect(() => {
    if (pickedIndex < 0) return;
    const x = pickedIndex * DAY_STEP;
    // First placement jumps; after that it slides.
    pillX.set(pillX.get() < 0 ? x : withSpring(x, spring.snap));
  }, [pickedIndex, pillX]);

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
          They’re fully booked for the next four weeks.
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
        // Stops quickly, on a whole day. While a list is still gliding, a tap only
        // stops it and presses nothing: a long glide made days feel dead to tap.
        snapToInterval={DAY_STEP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.days}
      >
        <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]} />
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

      {/* A new day's times arrive together rather than blinking in. */}
      <Animated.View key={day.date} entering={FadeIn.duration(180)} style={styles.body}>
        {PARTS.map((part, index) => {
          const from = index ? PARTS[index - 1].until : 0;
          const times = day.times.filter(t => {
            const hour = salonTime(t).getHours();
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
                    label={format(salonTime(time), 'HH:mm')}
                    selected={value === time}
                    onPress={() => onChange(time)}
                    accessibilityLabel={format(salonTime(time), 'EEEE d MMMM, HH:mm')}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}
