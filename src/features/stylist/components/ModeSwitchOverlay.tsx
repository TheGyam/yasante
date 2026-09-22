import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Scissors, UserRound } from 'lucide-react-native';
import { EASE_IN_OUT, EASE_OUT, makeStyles, radius, space, spring, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { useModeStore } from '../mode';

const DOT = 48;

// The whole moment runs about a second:
//   0ms    a wave of accent spreads from the tap, the ground follows just behind it
//   260ms  the new mode's icon turns in, its name rises
//   620ms  the tabs change underneath, unseen
//   900ms  the card lifts away, revealing them
const WAVE = { duration: 520, easing: EASE_IN_OUT };
const GROUND_LAG = 90;
const CONTENT_AT = 260;
const FLIP_AT = 620;
const LIFT_AT = 900;
const LIFT = { duration: 300, easing: EASE_OUT };

const COPY = {
  stylist: { icon: Scissors, title: 'Stylist mode', body: 'Requests, bookings and your page' },
  client: { icon: UserRound, title: 'Client mode', body: 'Styles, plans and your hair' },
} as const;

const useStyles = makeStyles(t => ({
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
  wave: { backgroundColor: t.colors.accent },
  ground: { backgroundColor: t.colors.bg },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  card: { alignItems: 'center', gap: space.md },
  well: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    marginBottom: space.sm,
  },
}));

/**
 * The moment between modes. The route guard swaps the tabs when the stored mode
 * changes; this covers the swap so it reads as one deliberate change of place.
 */
export function ModeSwitchOverlay() {
  const styles = useStyles();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const switchingTo = useModeStore(s => s.switchingTo);
  const origin = useModeStore(s => s.origin);

  const wave = useSharedValue(0);
  const ground = useSharedValue(0);
  const content = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (!switchingTo) return;
    const { setMode, endSwitch } = useModeStore.getState();

    if (reduced) {
      // Reduced motion: a plain crossfade, no wave or movement.
      wave.set(1);
      ground.set(1);
      content.set(1);
      lift.set(0);
      const flip = setTimeout(() => setMode(switchingTo), 150);
      const out = setTimeout(() => lift.set(withTiming(1, { duration: 200 })), 450);
      const done = setTimeout(endSwitch, 680);
      return () => [flip, out, done].forEach(clearTimeout);
    }

    wave.set(0);
    ground.set(0);
    content.set(0);
    lift.set(0);
    wave.set(withTiming(1, WAVE));
    ground.set(withDelay(GROUND_LAG, withTiming(1, WAVE)));
    content.set(withDelay(CONTENT_AT, withSpring(1, spring.snap)));

    const flip = setTimeout(() => setMode(switchingTo), FLIP_AT);
    const out = setTimeout(() => lift.set(withTiming(1, LIFT)), LIFT_AT);
    const done = setTimeout(endSwitch, LIFT_AT + LIFT.duration);
    return () => [flip, out, done].forEach(clearTimeout);
  }, [switchingTo, reduced, wave, ground, content, lift]);

  const x = origin?.x ?? width / 2;
  const y = origin?.y ?? height / 2;
  // Enough to cover the farthest corner from the tap.
  const cover = (2 * Math.hypot(Math.max(x, width - x), Math.max(y, height - y))) / DOT + 0.2;
  const position = { left: x - DOT / 2, top: y - DOT / 2 };

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(wave.get(), [0, 1], [0.1, cover]) }],
  }));
  const groundStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ground.get(), [0, 1], [0.1, cover]) }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - lift.get() }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: content.get() * (1 - lift.get()),
    transform: [
      { translateY: interpolate(content.get(), [0, 1], [18, 0]) },
      { scale: 1 + lift.get() * 0.06 },
    ],
  }));
  const wellStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(content.get(), [0, 1], [0.6, 1]) },
      {
        rotate: `${interpolate(content.get(), [0, 1], [switchingTo === 'stylist' ? -90 : 90, 0])}deg`,
      },
    ],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(content.get(), [0.5, 1], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(content.get(), [0, 1], [10, 0]) }],
  }));

  if (!switchingTo) return null;

  const copy = COPY[switchingTo];
  return (
    <Animated.View
      pointerEvents="auto"
      style={[StyleSheet.absoluteFill, overlayStyle]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Switching to ${copy.title.toLowerCase()}`}
    >
      <Animated.View style={[styles.dot, styles.wave, position, waveStyle]} />
      <Animated.View style={[styles.dot, styles.ground, position, groundStyle]} />
      <View style={styles.center} pointerEvents="none">
        <Animated.View style={[styles.card, cardStyle]}>
          <Animated.View style={[styles.well, wellStyle]}>
            <copy.icon size={38} color={theme.colors.accent} strokeWidth={2} />
          </Animated.View>
          <Text variant="title1">{copy.title}</Text>
          <Animated.View style={bodyStyle}>
            <Text variant="body" tone="secondary">
              {copy.body}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
