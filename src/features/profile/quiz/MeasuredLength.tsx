import { useState } from 'react';
import { View } from 'react-native';
import { makeStyles, space } from '@/shared/theme';
import { Input } from '@/shared/ui/Input';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';

const UNITS = [
  { value: 'in', label: 'in' },
  { value: 'cm', label: 'cm' },
] as const;
type Unit = (typeof UNITS)[number]['value'];
const CM_PER_INCH = 2.54;

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.md },
  field: { flex: 1 },
  units: { width: 104, paddingTop: space.sm },
}));

/**
 * For people who measure: stretched length in inches or centimetres. Never needed;
 * the reference point above is the answer. Stored in centimetres.
 */
export function MeasuredLength({
  cm,
  onChange,
}: {
  cm?: number;
  onChange: (cm: number | undefined) => void;
}) {
  const styles = useStyles();
  const [unit, setUnit] = useState<Unit>('in');
  const shown = (value?: number) =>
    value ? String(Math.round((unit === 'in' ? value / CM_PER_INCH : value) * 2) / 2) : '';
  const [text, setText] = useState(shown(cm));

  const change = (next: string) => {
    setText(next);
    const number = parseFloat(next.replace(',', '.'));
    const inCm = number > 0 ? (unit === 'in' ? number * CM_PER_INCH : number) : undefined;
    onChange(inCm && inCm <= 200 ? Math.round(inCm * 10) / 10 : undefined);
  };

  const switchUnit = (next: Unit) => {
    setUnit(next);
    setText(cm ? String(Math.round((next === 'in' ? cm / CM_PER_INCH : cm) * 2) / 2) : '');
  };

  return (
    <View style={styles.row}>
      <Input
        label="Measured it? (optional)"
        value={text}
        onChangeText={change}
        keyboardType="decimal-pad"
        containerStyle={styles.field}
        accessibilityHint="Your stretched length, if you've measured it"
      />
      <View style={styles.units}>
        <SegmentedControl options={UNITS} value={unit} onChange={switchUnit} />
      </View>
    </View>
  );
}
