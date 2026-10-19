import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { EASE_OUT, makeStyles, space, useTheme } from '@/shared/theme';
import type { HairTexture } from '../types';
import { ChoiceCard } from './ChoiceCard';
import { STRAND_BOX, strand } from './strands';
import { SEP } from '@/shared/lib/format';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const TEXTURES: readonly { value: HairTexture; label: string; code: string }[] = [
  { value: 'straight', label: 'Straight', code: 'Type 1' },
  { value: 'wavy', label: 'Wavy', code: '2A–2C' },
  { value: 'curly', label: 'Curly', code: '3A–3C' },
  { value: 'coily', label: 'Coily', code: '4A–4B' },
  { value: 'kinky', label: 'Kinky', code: `4C${SEP}zig-zag` },
];

// Generated once for the life of the app.
const STRANDS = Object.fromEntries(TEXTURES.map(t => [t.value, strand(t.value)])) as Record<
  HairTexture,
  ReturnType<typeof strand>
>;

const DRAW = { duration: 700, easing: EASE_OUT };

const useStyles = makeStyles(() => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  cell: { width: '31.5%' },
}));

/** A strand of the pattern. Choosing it draws the strand from root to tip. */
export function StrandArt({
  texture,
  selected,
  height = 84,
}: {
  texture: HairTexture;
  selected: boolean;
  height?: number;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { d, length } = STRANDS[texture];
  const drawn = useSharedValue(1);

  useEffect(() => {
    if (!selected || reduced) return;
    drawn.set(0);
    drawn.set(withTiming(1, DRAW));
  }, [selected, reduced, drawn]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - drawn.get()),
  }));

  return (
    <Svg
      width={(height * STRAND_BOX.width) / STRAND_BOX.height}
      height={height}
      viewBox={`0 0 ${STRAND_BOX.width} ${STRAND_BOX.height}`}
    >
      <AnimatedPath
        d={d}
        fill="none"
        stroke={selected ? theme.colors.accent : theme.colors.text.secondary}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={length}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

export function TextureStep({
  value,
  onChange,
}: {
  value?: HairTexture;
  onChange: (value: HairTexture) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {TEXTURES.map(t => (
        <ChoiceCard
          key={t.value}
          label={t.label}
          hint={t.code}
          selected={value === t.value}
          onPress={() => onChange(t.value)}
          style={styles.cell}
        >
          <StrandArt texture={t.value} selected={value === t.value} />
        </ChoiceCard>
      ))}
    </View>
  );
}
