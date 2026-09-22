import { View } from 'react-native';
import {
  Ban,
  Droplet,
  Droplets,
  FlaskConical,
  Flame,
  Leaf,
  Palette,
  PoundSterling,
  Snowflake,
  Sun,
  Wind,
  type LucideIcon,
  Waves,
} from 'lucide-react-native';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import type { ChemicalTreatment, ScalpType, StyleBudget } from '../types';
import { ChoiceCard } from './ChoiceCard';

const useStyles = makeStyles(() => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: '48.5%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  body: { gap: space.lg },
}));

function Grid<T extends string>({
  options,
  isSelected,
  onPress,
  multiple,
}: {
  options: readonly { value: T; label: string; hint?: string; icon: LucideIcon }[];
  isSelected: (value: T) => boolean;
  onPress: (value: T) => void;
  multiple?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.grid} accessibilityRole={multiple ? undefined : 'radiogroup'}>
      {options.map(option => {
        const selected = isSelected(option.value);
        const Icon = option.icon;
        return (
          <ChoiceCard
            key={option.value}
            label={option.label}
            hint={option.hint}
            selected={selected}
            multiple={multiple}
            onPress={() => onPress(option.value)}
            style={styles.cell}
          >
            <Icon
              size={26}
              color={selected ? theme.colors.accent : theme.colors.text.secondary}
              strokeWidth={1.8}
            />
          </ChoiceCard>
        );
      })}
    </View>
  );
}

const SCALP: readonly { value: ScalpType; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'balanced', label: 'Balanced', hint: 'Nothing to report', icon: Leaf },
  { value: 'dry', label: 'Dry or tight', hint: 'Needs oil often', icon: Sun },
  { value: 'oily', label: 'Oily', hint: 'Greasy by day three', icon: Droplet },
  { value: 'flaky', label: 'Flaky', hint: 'Flakes or buildup', icon: Snowflake },
  { value: 'sensitive', label: 'Sensitive', hint: 'Itches or reacts', icon: Flame },
];

const toggle = <T,>(list: T[] = [], value: T) =>
  list.includes(value) ? list.filter(v => v !== value) : [...list, value];

export function ScalpStep({
  value,
  onChange,
}: {
  value?: ScalpType[];
  onChange: (value: ScalpType[]) => void;
}) {
  return (
    <Grid
      options={SCALP}
      multiple
      isSelected={v => !!value?.includes(v)}
      onPress={v => {
        // Balanced means none of the others.
        if (v === 'balanced') return onChange(['balanced']);
        onChange(
          toggle(
            (value ?? []).filter(s => s !== 'balanced'),
            v
          )
        );
      }}
    />
  );
}

const CHEMICALS: readonly {
  value: ChemicalTreatment;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { value: 'relaxer', label: 'Relaxer', hint: 'Permanent straightening', icon: Wind },
  { value: 'texturiser', label: 'Texturiser', hint: 'Loosened curls', icon: Waves },
  { value: 'colour', label: 'Colour', hint: 'Dye, not bleach', icon: Palette },
  { value: 'bleach', label: 'Bleach', hint: 'Lightened', icon: FlaskConical },
  { value: 'keratin', label: 'Keratin', hint: 'Smoothing treatment', icon: Droplets },
];

export function ChemicalStep({
  value,
  onChange,
}: {
  value?: ChemicalTreatment[];
  onChange: (value: ChemicalTreatment[]) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const none = value !== undefined && value.length === 0;
  return (
    <View style={styles.body}>
      <Grid
        options={CHEMICALS}
        multiple
        isSelected={v => !!value?.includes(v)}
        onPress={v => onChange(toggle(value, v))}
      />
      <ChoiceCard label="None, ever" selected={none} onPress={() => onChange([])}>
        <Ban
          size={24}
          color={none ? theme.colors.accent : theme.colors.text.secondary}
          strokeWidth={1.8}
        />
      </ChoiceCard>
    </View>
  );
}

const BUDGETS: readonly { value: StyleBudget; label: string; icon: LucideIcon }[] = [
  { value: 'under_50', label: 'Under £50', icon: PoundSterling },
  { value: '50_100', label: '£50–100', icon: PoundSterling },
  { value: '100_150', label: '£100–150', icon: PoundSterling },
  { value: '150_plus', label: '£150 or more', icon: PoundSterling },
];

export function BudgetStep({
  value,
  onChange,
}: {
  value?: StyleBudget;
  onChange: (value: StyleBudget) => void;
}) {
  return <Grid options={BUDGETS} isSelected={v => v === value} onPress={onChange} />;
}

/** Districts people already book in. Typing one that isn't here is fine too. */
const AREAS = ['Peckham', 'Brixton', 'Dalston', 'Hackney', 'Lewisham', 'Croydon', 'Tottenham'];

export function AreaStep({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.body}>
      <View style={styles.chips}>
        {AREAS.map(area => (
          <Chip key={area} label={area} selected={value === area} onPress={() => onChange(area)} />
        ))}
      </View>
      <Input
        label="Or type your area"
        value={value ?? ''}
        onChangeText={onChange}
        placeholder="e.g. Walthamstow"
        autoCapitalize="words"
        maxLength={40}
      />
      <Text variant="caption" tone="tertiary">
        A district, never your address.
      </Text>
    </View>
  );
}
