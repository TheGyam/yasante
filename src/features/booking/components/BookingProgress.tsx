import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { makeStyles, space, spring, useTheme } from '@/shared/theme';
import { LiveDot, Pop } from '@/shared/ui/Motion';
import { Text } from '@/shared/ui/Text';
import type { Booking } from '../types';

const DOT = 22;

const useStyles = makeStyles(t => ({
  wrap: { paddingVertical: space.sm },
  line: {
    position: 'absolute',
    left: DOT / 2,
    right: DOT / 2,
    top: space.sm + DOT / 2 - 1.5,
    height: 3,
  },
  track: { flex: 1, borderRadius: 2, backgroundColor: t.colors.glass.fillStrong },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: t.colors.accent,
  },
  steps: { flexDirection: 'row', justifyContent: 'space-between' },
  step: { alignItems: 'center', gap: space.xs, width: 64 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bg,
    borderWidth: 2,
    borderColor: t.colors.glass.highlight,
  },
  done: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  now: { borderColor: t.colors.accent },
}));

type Step = { key: string; label: string };

/** The road from asking to done, for the states that are on it. Off-road ones get no bar. */
export function stepsFor(booking: Pick<Booking, 'status' | 'deposit'>) {
  const steps: Step[] = [
    { key: 'requested', label: 'Asked' },
    { key: 'accepted', label: 'Accepted' },
    ...(booking.deposit ? [{ key: 'deposit', label: 'Deposit' }] : []),
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Done' },
  ];
  const reached: Record<string, number> = {
    requested: 0,
    awaiting_deposit: booking.deposit ? 2 : 1,
    confirmed: steps.length - 2,
    completed: steps.length - 1,
  };
  const at = reached[booking.status];
  return at === undefined ? null : { steps, at };
}

/**
 * Where a booking has got to. The line fills to the current step with a spring; the
 * step waiting on someone breathes. All of it on the UI thread: a status change
 * re-renders this once, and the movement runs without React.
 */
export function BookingProgress({ booking }: { booking: Pick<Booking, 'status' | 'deposit'> }) {
  const styles = useStyles();
  const theme = useTheme();
  const road = stepsFor(booking);
  const width = useSharedValue(0);
  const share = useSharedValue(0);
  const target = road ? road.at / (road.steps.length - 1) : 0;
  useEffect(() => {
    share.set(withSpring(target, { ...spring.settle, duration: 700 }));
  }, [target, share]);
  const fill = useAnimatedStyle(() => ({ width: width.get() * share.get() }));

  if (!road) return null;
  const { steps, at } = road;
  const finished = booking.status === 'completed';

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${at + 1} of ${steps.length}: ${steps[at].label}`}
    >
      <View style={styles.line} onLayout={e => width.set(e.nativeEvent.layout.width)}>
        <View style={styles.track} />
        <Animated.View style={[styles.fill, fill]} />
      </View>
      <View style={styles.steps}>
        {steps.map((step, i) => {
          const done = i < at || (finished && i === at);
          const now = i === at && !finished;
          return (
            <View key={step.key} style={styles.step}>
              <Pop trigger={done ? `${step.key}-done` : undefined} delay={i * 60}>
                <View style={[styles.dot, done && styles.done, now && styles.now]}>
                  {done ? (
                    <Check size={13} color={theme.colors.text.onAccent} strokeWidth={3.2} />
                  ) : now ? (
                    <LiveDot size={8} />
                  ) : null}
                </View>
              </Pop>
              <Text variant="caption" tone={done || now ? 'primary' : 'tertiary'} align="center">
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
