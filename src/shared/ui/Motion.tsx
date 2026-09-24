/**
 * The app's small motion kit: tilt, flip, confetti, a rolling value, a live dot and a
 * gentle float. Every one moves only transform and opacity, driven by shared values
 * on the UI thread, so none of them re-renders React while it runs, and all of them
 * step aside for the system's reduce-motion setting.
 */
import { useEffect, useMemo, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeOutUp,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { EASE_OUT, spring, timing, useTheme } from '@/shared/theme';
import { haptics, type HapticKind } from '@/shared/lib/haptics';
import { Text, type TextProps } from './Text';

const PERSPECTIVE = 900;

// ── Tilt ──────────────────────────────────────────────────────────────────────────

export interface TiltProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** How far it leans toward the finger, in degrees. */
  maxTilt?: number;
  haptic?: HapticKind;
}

/**
 * A card that leans toward where it's pressed, like something physical, and springs
 * back flat on release. Pressing never renders React: the lean is two shared values.
 */
export function Tilt({
  children,
  style,
  containerStyle,
  maxTilt = 7,
  haptic,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityRole = 'button',
  ...rest
}: TiltProps) {
  const reduced = useReducedMotion();
  const size = useSharedValue({ width: 1, height: 1 });
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const pressed = useSharedValue(0);

  const lean = useAnimatedStyle(() => ({
    transform: reduced
      ? [{ scale: 1 - pressed.get() * 0.02 }]
      : [
          { perspective: PERSPECTIVE },
          { rotateX: `${rx.get()}deg` },
          { rotateY: `${ry.get()}deg` },
          { scale: 1 - pressed.get() * 0.025 },
        ],
  }));

  const pressIn = (e: GestureResponderEvent) => {
    const { width, height } = size.get();
    const x = e.nativeEvent.locationX / width - 0.5;
    const y = e.nativeEvent.locationY / height - 0.5;
    // Pressing the top edge tips the top away, the way a card on a table would.
    rx.set(withTiming(-y * maxTilt * 2, timing.pressIn));
    ry.set(withTiming(x * maxTilt * 2, timing.pressIn));
    pressed.set(withTiming(1, timing.pressIn));
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    rx.set(withSpring(0, spring.snap));
    ry.set(withSpring(0, spring.snap));
    pressed.set(withSpring(0, spring.snap));
    onPressOut?.(e);
  };

  return (
    <Pressable
      {...rest}
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      style={containerStyle}
      pressRetentionOffset={16}
      onLayout={(e: LayoutChangeEvent) => size.set(e.nativeEvent.layout)}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={e => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
    >
      <Animated.View style={[style, lean]}>{children}</Animated.View>
    </Pressable>
  );
}

// ── Flip ──────────────────────────────────────────────────────────────────────────

/**
 * Two faces of one card, turned over in 3D when `flipped` changes: the front is what
 * she's working toward, the back is what she's done. Starts on the right face without
 * animating, so opening a screen never replays it.
 */
export function Flip({
  front,
  back,
  flipped,
  style,
}: {
  front: ReactNode;
  back: ReactNode;
  flipped: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const turn = useSharedValue(flipped ? 1 : 0);
  useEffect(() => {
    turn.set(
      reduced
        ? flipped
          ? 1
          : 0
        : withSpring(flipped ? 1 : 0, { duration: 700, dampingRatio: 0.72 })
    );
  }, [flipped, reduced, turn]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${turn.get() * 180}deg` }],
    opacity: turn.get() < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${turn.get() * 180 - 180}deg` }],
    opacity: turn.get() >= 0.5 ? 1 : 0,
  }));

  return (
    <View style={style}>
      <Animated.View style={frontStyle} pointerEvents={flipped ? 'none' : 'auto'}>
        {front}
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFill, backStyle]}
        pointerEvents={flipped ? 'auto' : 'none'}
      >
        {back}
      </Animated.View>
    </View>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────────────

const PIECES = 22;

function Piece({
  progress,
  dx,
  dy,
  spin,
  color,
  size,
  round,
}: {
  progress: SharedValue<number>;
  dx: number;
  dy: number;
  spin: number;
  color: string;
  size: number;
  round: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    // Out fast, then a little gravity: the arc reads as thrown, not slid.
    const x = dx * p;
    const y = dy * p + 260 * p * p;
    return {
      opacity: p === 0 ? 0 : interpolate(p, [0, 0.1, 0.75, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${spin * p}deg` },
        { scale: interpolate(p, [0, 0.15, 1], [0.4, 1, 0.8]) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: size,
          height: round ? size : size * 0.45,
          borderRadius: round ? size / 2 : 1,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * A short burst from the centre of its box, once each time `fire` changes (and only
 * when it's truthy). For the rare moments worth celebrating — a booking confirmed, a
 * routine done — never for things that happen all day.
 */
export function Confetti({ fire }: { fire: unknown }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const pieces = useMemo(() => {
    const colors = [
      theme.colors.accent,
      theme.colors.gold,
      theme.colors.success,
      theme.colors.text.primary,
    ];
    return Array.from({ length: PIECES }, (_, i) => {
      const angle = (i / PIECES) * Math.PI * 2 + (i % 3) * 0.2;
      const force = 90 + ((i * 37) % 70);
      return {
        dx: Math.cos(angle) * force,
        dy: Math.sin(angle) * force - 120,
        spin: (i % 2 ? 1 : -1) * (180 + ((i * 53) % 360)),
        color: colors[i % colors.length],
        size: 6 + (i % 4) * 2,
        round: i % 3 === 0,
      };
    });
  }, [theme]);

  useEffect(() => {
    if (!fire || reduced) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
    return () => cancelAnimation(progress);
  }, [fire, reduced, progress]);

  if (reduced) return null;
  return (
    <View pointerEvents="none" style={styles.burst}>
      {pieces.map((piece, i) => (
        <Piece key={i} progress={progress} {...piece} />
      ))}
    </View>
  );
}

// ── Rolling value ─────────────────────────────────────────────────────────────────

/**
 * Text that rolls to a new value: the old one lifts away as the new one rises in.
 * For numbers that change because of what she just did (a price, a count).
 */
export function RollingText({ children, style, ...rest }: TextProps & { children: string }) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.roll}>
      <Animated.View
        key={children}
        entering={reduced ? undefined : FadeInDown.duration(220).easing(EASE_OUT)}
        exiting={reduced ? undefined : FadeOutUp.duration(160)}
      >
        <Text {...rest} style={style}>
          {children}
        </Text>
      </Animated.View>
    </View>
  );
}

// ── Live dot ──────────────────────────────────────────────────────────────────────

/** A dot with a slow ring breathing out of it: something is in progress, on someone else. */
export function LiveDot({ color, size = 10 }: { color?: string; size?: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const tint = color ?? theme.colors.accent;
  const ring = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    ring.set(
      withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false)
    );
    return () => cancelAnimation(ring);
  }, [reduced, ring]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.get(), [0, 1], [0.55, 0]),
    transform: [{ scale: interpolate(ring.get(), [0, 1], [1, 2.6]) }],
  }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, backgroundColor: tint },
          ringStyle,
        ]}
      />
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: tint }]} />
    </View>
  );
}

// ── Float ─────────────────────────────────────────────────────────────────────────

/** A slow, small bob, for an illustration on an empty screen: alive, not busy. */
export function Float({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      )
    );
    return () => cancelAnimation(t);
  }, [reduced, t]);
  const bob = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.get(), [0, 1], [3, -3]) },
      { rotate: `${interpolate(t.get(), [0, 1], [-2, 2])}deg` },
    ],
  }));
  return <Animated.View style={[style, bob]}>{children}</Animated.View>;
}

// ── Pop ───────────────────────────────────────────────────────────────────────────

/**
 * A small bounce each time `trigger` changes: the thing that just changed says so.
 * `withDelay` lets a row of them go off one after another.
 */
export function Pop({
  trigger,
  delay = 0,
  children,
  style,
}: {
  trigger: unknown;
  delay?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (reduced || trigger === undefined) return;
    s.set(
      withDelay(
        delay,
        withSequence(
          withTiming(1.22, { duration: 120, easing: EASE_OUT }),
          withSpring(1, spring.snap)
        )
      )
    );
    // Only when the trigger changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return <Animated.View style={[style, pop]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
  burst: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 10,
  },
  roll: { overflow: 'hidden' },
});
