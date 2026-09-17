import { useEffect, useState, type ComponentType } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { Clock3, Hourglass, Wind, type LucideIcon } from 'lucide-react-native';
import { makeStyles, space, spring, useTheme } from '@/shared/theme';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';
import type { HairDensity, HairPorosity } from '../types';
import { ChoiceCard } from './ChoiceCard';

type Level = 'low' | 'medium' | 'high';
type ArtProps = { level: Level; selected: boolean };

interface Method<T extends string> {
  key: string;
  label: string;
  instruction: string;
  options: readonly { value: T; level: Level; label: string; hint: string }[];
  Art: ComponentType<ArtProps>;
}

const ART = { width: 84, height: 84 };

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
  row: { flexDirection: 'row', gap: space.sm },
  cell: { flex: 1 },
}));

/** Answer by doing something simple with your own hair, picked from pictures of the outcomes. */
function TestStep<T extends string>({
  methods,
  value,
  onChange,
}: {
  methods: readonly [Method<T>, Method<T>];
  value?: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  const [methodKey, setMethodKey] = useState(methods[0].key);
  const method = methods.find(m => m.key === methodKey) ?? methods[0];

  return (
    <View style={styles.body}>
      <SegmentedControl
        options={methods.map(m => ({ value: m.key, label: m.label }))}
        value={methodKey}
        onChange={setMethodKey}
      />
      <Text variant="subhead" tone="secondary">
        {method.instruction}
      </Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {method.options.map(option => (
          <ChoiceCard
            key={option.value}
            label={option.label}
            hint={option.hint}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
            style={styles.cell}
          >
            <method.Art level={option.level} selected={value === option.value} />
          </ChoiceCard>
        ))}
      </View>
    </View>
  );
}

// ——— Density ———

/** A ponytail seen end on, with the hair tie wrapped around it once, twice or three times. */
function PonytailArt({ level, selected }: ArtProps) {
  const theme = useTheme();
  const r = { low: 11, medium: 17, high: 24 }[level];
  const wraps = { low: 3, medium: 2, high: 1 }[level];
  const ink = selected ? theme.colors.accent : theme.colors.text.secondary;
  return (
    <Svg width={ART.width} height={ART.height} viewBox="0 0 84 84">
      <Circle
        cx={42}
        cy={42}
        r={r}
        fill={selected ? theme.colors.accent : theme.colors.text.tertiary}
        opacity={0.45}
      />
      {Array.from({ length: wraps }, (_, i) => (
        <Circle
          key={i}
          cx={42}
          cy={42}
          r={r + 3 + i * 4.5}
          fill="none"
          stroke={ink}
          strokeWidth={2.2}
        />
      ))}
    </Svg>
  );
}

/** The crown from above, parted down the middle, with more or less scalp showing. */
function ScalpArt({ level, selected }: ArtProps) {
  const theme = useTheme();
  const count = { low: 7, medium: 13, high: 21 }[level];
  const ink = selected ? theme.colors.accent : theme.colors.text.secondary;
  return (
    <Svg width={ART.width} height={ART.height} viewBox="0 0 84 84">
      <Circle cx={42} cy={46} r={30} fill={theme.colors.glass.fillStrong} />
      <Line x1={42} y1={16} x2={42} y2={76} stroke={theme.colors.text.tertiary} strokeWidth={1.2} />
      {Array.from({ length: count }, (_, i) => {
        const y = 22 + (i * 50) / count;
        const spread = Math.sqrt(Math.max(0, 900 - (y - 46) ** 2));
        const offset = 5 + (((i * 37) % 11) / 11) * (spread - 10);
        return [-1, 1].map(side => (
          <Line
            key={`${i}${side}`}
            x1={42 + side * offset}
            y1={y}
            x2={42 + side * (offset + 5)}
            y2={y + 6}
            stroke={ink}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ));
      })}
    </Svg>
  );
}

export const DENSITY_METHODS: readonly [Method<HairDensity>, Method<HairDensity>] = [
  {
    key: 'ponytail',
    label: 'Ponytail test',
    instruction:
      'Pull your hair into a ponytail at the nape and wrap a standard hair tie around it. How many times does it go round?',
    options: [
      { value: 'fine', level: 'low', label: '3 or more', hint: 'Low density' },
      { value: 'medium', level: 'medium', label: 'Twice', hint: 'Medium density' },
      { value: 'thick', level: 'high', label: 'Once, snug', hint: 'High density' },
    ],
    Art: PonytailArt,
  },
  {
    key: 'scalp',
    label: 'Mirror test',
    instruction:
      'Too short or locked for a ponytail? Part your dry hair at the crown and look in a mirror.',
    options: [
      { value: 'fine', level: 'low', label: 'Scalp shows', hint: 'Low density' },
      { value: 'medium', level: 'medium', label: 'A little', hint: 'Medium density' },
      { value: 'thick', level: 'high', label: 'Hard to see', hint: 'High density' },
    ],
    Art: ScalpArt,
  },
];

// ——— Porosity ———

const FLOAT_Y = { low: 0, medium: 20, high: 40 } as const;

/** A glass of water. Choose an answer and the strand settles where it would. */
function GlassArt({ level, selected }: ArtProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const y = useSharedValue(FLOAT_Y[level]);

  useEffect(() => {
    if (!selected || reduced) return;
    // Dropped in at the surface, then left to find its level.
    y.set(0);
    y.set(withDelay(120, withSpring(FLOAT_Y[level], { ...spring.settle, duration: 900 })));
  }, [selected, reduced, level, y]);

  const strandStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const ink = selected ? theme.colors.accent : theme.colors.text.secondary;

  return (
    <View style={{ width: ART.width, height: ART.height }}>
      <Svg
        width={ART.width}
        height={ART.height}
        viewBox="0 0 84 84"
        style={{ position: 'absolute' }}
      >
        <Rect
          x={22}
          y={20}
          width={40}
          height={52}
          rx={6}
          fill={theme.colors.accentSoft}
          opacity={0.5}
        />
        <Path
          d="M18 10 L22 74 Q23 78 28 78 L56 78 Q61 78 62 74 L66 10"
          fill="none"
          stroke={theme.colors.text.tertiary}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Ellipse
          cx={42}
          cy={20}
          rx={21}
          ry={2.5}
          fill="none"
          stroke={theme.colors.text.tertiary}
          strokeWidth={1}
          opacity={0.6}
        />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: 28, top: 22 }, strandStyle]}>
        <Svg width={28} height={10} viewBox="0 0 28 10">
          <Path
            d="M2 6 Q7 1 12 5 T22 5 T27 4"
            fill="none"
            stroke={ink}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function DryingArt({ level, selected }: ArtProps) {
  const theme = useTheme();
  const Icon: LucideIcon = { low: Hourglass, medium: Clock3, high: Wind }[level];
  return (
    <View
      style={{
        width: ART.width,
        height: ART.height,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon
        size={40}
        strokeWidth={1.6}
        color={selected ? theme.colors.accent : theme.colors.text.secondary}
      />
    </View>
  );
}

export const POROSITY_METHODS: readonly [Method<HairPorosity>, Method<HairPorosity>] = [
  {
    key: 'float',
    label: 'Float test',
    instruction:
      'Drop a few clean, shed strands into a glass of room-temperature water. Wait four minutes, then look.',
    options: [
      { value: 'low', level: 'low', label: 'Floats', hint: 'Low porosity' },
      { value: 'medium', level: 'medium', label: 'Hovers', hint: 'Medium porosity' },
      { value: 'high', level: 'high', label: 'Sinks', hint: 'High porosity' },
    ],
    Art: GlassArt,
  },
  {
    key: 'drying',
    label: 'Wash day',
    instruction: 'No glass handy? Think about your last wash. How did your hair take the water?',
    options: [
      { value: 'low', level: 'low', label: 'Slow to wet, slow to dry', hint: 'Low porosity' },
      { value: 'medium', level: 'medium', label: 'Wets and dries easily', hint: 'Medium porosity' },
      { value: 'high', level: 'high', label: 'Soaks up fast, dries fast', hint: 'High porosity' },
    ],
    Art: DryingArt,
  },
];

export const DensityStep = (props: { value?: HairDensity; onChange: (v: HairDensity) => void }) => (
  <TestStep methods={DENSITY_METHODS} {...props} />
);

export const PorosityStep = (props: {
  value?: HairPorosity;
  onChange: (v: HairPorosity) => void;
}) => <TestStep methods={POROSITY_METHODS} {...props} />;
