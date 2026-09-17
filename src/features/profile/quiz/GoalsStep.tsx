import { View } from 'react-native';
import {
  Droplets,
  HeartPulse,
  Palette,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import type { HairGoal } from '../types';
import { ChoiceCard } from './ChoiceCard';

const GOALS: readonly { value: HairGoal; label: string; icon: LucideIcon }[] = [
  { value: 'growth', label: 'Length', icon: TrendingUp },
  { value: 'health', label: 'Healthier hair', icon: HeartPulse },
  { value: 'moisture', label: 'Moisture', icon: Droplets },
  { value: 'strength', label: 'Less breakage', icon: ShieldCheck },
  { value: 'color', label: 'Colour care', icon: Palette },
  { value: 'style', label: 'New styles', icon: Sparkles },
];

const useStyles = makeStyles(() => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: '48.5%' },
}));

export function GoalsStep({
  value = [],
  onChange,
}: {
  value?: HairGoal[];
  onChange: (value: HairGoal[]) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {GOALS.map(goal => {
        const selected = value.includes(goal.value);
        return (
          <ChoiceCard
            key={goal.value}
            label={goal.label}
            multiple
            selected={selected}
            onPress={() =>
              onChange(selected ? value.filter(v => v !== goal.value) : [...value, goal.value])
            }
            style={styles.cell}
          >
            <goal.icon
              size={26}
              strokeWidth={2}
              color={selected ? theme.colors.accent : theme.colors.text.secondary}
            />
          </ChoiceCard>
        );
      })}
    </View>
  );
}
