import { View } from 'react-native';
import { makeStyles, space } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { Input } from '@/shared/ui/Input';
import { PAYMENT_KINDS } from '../format';
import type { PaymentMethod } from '../types';

export type PaymentMethodDraft = Omit<PaymentMethod, 'id'>;

const useStyles = makeStyles(() => ({
  body: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));

const KNOWN = PAYMENT_KINDS.map(kind => kind.label as string);

/**
 * One way to be paid: pick the kind, type what the client needs. "Other" lets
 * her name it herself.
 */
export function PaymentMethodForm({
  value,
  onChange,
}: {
  value: PaymentMethodDraft;
  onChange: (value: PaymentMethodDraft) => void;
}) {
  const styles = useStyles();
  const other = !KNOWN.includes(value.label);
  const placeholder =
    PAYMENT_KINDS.find(kind => kind.label === value.label)?.placeholder ??
    'What they need to pay you';

  return (
    <View style={styles.body}>
      <View style={styles.chips}>
        {KNOWN.map(label => (
          <Chip
            key={label}
            label={label}
            selected={value.label === label}
            onPress={() => onChange({ ...value, label })}
          />
        ))}
        <Chip label="Other" selected={other} onPress={() => onChange({ ...value, label: '' })} />
      </View>
      {other && (
        <Input
          label="What it's called"
          value={value.label}
          onChangeText={label => onChange({ ...value, label })}
          placeholder="Cash App"
          autoCapitalize="words"
        />
      )}
      <Input
        label={value.label === 'Bank transfer' ? 'Name, sort code and account' : 'Details'}
        value={value.details}
        onChangeText={details => onChange({ ...value, details })}
        placeholder={placeholder}
        autoCapitalize="none"
        hint="Sent only to a client once you accept. Yasante never handles the money"
      />
    </View>
  );
}
