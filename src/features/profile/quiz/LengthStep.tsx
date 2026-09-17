import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { haptics } from '@/shared/lib/haptics';
import { fonts, makeStyles, space, spring, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import type { HairLength } from '../types';

// The figure is drawn in a 200 × 400 box; each length sits at a real point on the body.
const BOX = { width: 200, height: 400 };
const HAIR_TOP = 14;

export const LENGTHS: readonly { value: HairLength; label: string; y: number }[] = [
  { value: 'cropped', label: 'Cropped', y: 30 },
  { value: 'ear', label: 'Ear', y: 60 },
  { value: 'chin', label: 'Chin', y: 92 },
  { value: 'shoulder', label: 'Shoulder', y: 124 },
  { value: 'armpit', label: 'Armpit', y: 170 },
  { value: 'mid-back', label: 'Mid-back', y: 224 },
  { value: 'waist', label: 'Waist', y: 284 },
  { value: 'hip', label: 'Hip or longer', y: 346 },
];
const LEVEL_YS = LENGTHS.map(l => l.y);

const BODY =
  'M46 400C46 336 54 304 60 284C52 244 46 204 44 164Q44 122 80 116L120 116Q156 122 156 164C154 204 148 244 140 284C146 304 154 336 154 400Z';

const LABEL_WIDTH = 104;

const useStyles = makeStyles(t => ({
  wrap: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  stage: { flexDirection: 'row' },
  hair: {
    position: 'absolute',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: t.colors.accentSoft,
    borderWidth: 1.5,
    borderColor: t.colors.accent,
  },
  labels: { width: LABEL_WIDTH },
  label: { position: 'absolute', left: space.md, height: 28, justifyContent: 'center' },
  labelText: { fontFamily: fonts.medium, fontSize: 14, color: t.colors.text.tertiary },
  labelActive: { fontFamily: fonts.semibold, color: t.colors.accent },
}));

export function LengthStep({
  value,
  onChange,
}: {
  value?: HairLength;
  onChange: (value: HairLength) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const [height, setHeight] = useState(0);

  const figureHeight = Math.min(height, 380);
  const figureWidth = figureHeight / 2;
  const scale = figureHeight / BOX.height;

  const selected = useSharedValue(LENGTHS.findIndex(l => l.value === value));

  // Only a change of detent reaches React: one render and one tick per reference point
  // crossed, never one per frame of the drag.
  useAnimatedReaction(
    () => selected.get(),
    (index, previous) => {
      if (previous === null || index === previous || index < 0) return;
      scheduleOnRN(haptics.selection);
      scheduleOnRN(onChange, LENGTHS[index].value);
    }
  );

  const pick = (y: number) => {
    'worklet';
    const boxY = y / scale;
    let nearest = 0;
    for (let i = 1; i < LEVEL_YS.length; i++) {
      if (Math.abs(LEVEL_YS[i] - boxY) < Math.abs(LEVEL_YS[nearest] - boxY)) nearest = i;
    }
    selected.set(nearest);
  };

  const scrub = Gesture.Pan()
    .minDistance(0)
    .onBegin(e => pick(e.y))
    .onUpdate(e => pick(e.y));

  const hairStyle = useAnimatedStyle(() => {
    const index = selected.get();
    const bottom = index < 0 ? LEVEL_YS[3] : LEVEL_YS[index];
    return {
      height: withSpring((bottom - HAIR_TOP) * scale, spring.snap),
      opacity: withSpring(index < 0 ? 0.35 : 1, spring.settle),
    };
  });

  const onLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {figureHeight > 0 && (
        <GestureDetector gesture={scrub}>
          <View
            style={[styles.stage, { height: figureHeight }]}
            accessibilityRole="adjustable"
            accessibilityLabel="Hair length"
            accessibilityValue={{ text: LENGTHS.find(l => l.value === value)?.label ?? 'Not set' }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={e => {
              const current = LENGTHS.findIndex(l => l.value === value);
              const next = e.nativeEvent.actionName === 'increment' ? current + 1 : current - 1;
              if (next >= 0 && next < LENGTHS.length) selected.set(next);
            }}
          >
            <View style={{ width: figureWidth, height: figureHeight }}>
              <Svg
                width={figureWidth}
                height={figureHeight}
                viewBox={`0 0 ${BOX.width} ${BOX.height}`}
                style={{ position: 'absolute' }}
              >
                <Path
                  d={BODY}
                  fill={theme.colors.glass.fillStrong}
                  stroke={theme.colors.glass.border}
                />
                {LENGTHS.map(l => (
                  <Line
                    key={l.value}
                    x1={0}
                    x2={BOX.width}
                    y1={l.y}
                    y2={l.y}
                    stroke={theme.colors.separator}
                    strokeDasharray="3 5"
                  />
                ))}
              </Svg>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.hair,
                  { top: HAIR_TOP * scale, left: 56 * scale, width: 88 * scale },
                  hairStyle,
                ]}
              />
              {/* Head and neck sit in front, so the hair falls behind them. */}
              <Svg
                width={figureWidth}
                height={figureHeight}
                viewBox={`0 0 ${BOX.width} ${BOX.height}`}
                style={{ position: 'absolute' }}
                pointerEvents="none"
              >
                <Rect x={88} y={86} width={24} height={34} rx={8} fill={theme.colors.bg} />
                <Rect
                  x={88}
                  y={86}
                  width={24}
                  height={34}
                  rx={8}
                  fill={theme.colors.glass.fillStrong}
                />
                <Circle cx={100} cy={58} r={34} fill={theme.colors.bg} />
                <Circle
                  cx={100}
                  cy={58}
                  r={34}
                  fill={theme.colors.glass.fillStrong}
                  stroke={theme.colors.glass.border}
                />
              </Svg>
            </View>

            <View style={styles.labels}>
              {LENGTHS.map(l => (
                <Pressable
                  key={l.value}
                  style={[styles.label, { top: l.y * scale - 14 }]}
                  hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === l.value }}
                  onPress={() => selected.set(LENGTHS.indexOf(l))}
                >
                  <Text
                    style={[styles.labelText, value === l.value && styles.labelActive]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {l.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </GestureDetector>
      )}
    </View>
  );
}
