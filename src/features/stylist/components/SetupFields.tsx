import { View } from 'react-native';
import { Building2, Car, Clock, House, type LucideIcon } from 'lucide-react-native';
import { makeStyles, space } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Section } from '@/shared/ui/Section';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';
import type { DepositType, ServiceModel, StylistPolicies } from '../types';

const MODELS: readonly { value: ServiceModel; label: string; hint: string; icon: LucideIcon }[] = [
  {
    value: 'salon',
    label: 'At a salon',
    hint: 'Clients come to a salon or chair you work from',
    icon: Building2,
  },
  {
    value: 'home',
    label: 'From home',
    hint: 'Clients come to you. Only your area is shown until you confirm a booking',
    icon: House,
  },
  {
    value: 'mobile',
    label: 'I travel',
    hint: 'You go to the client. Clients can pick “Come to me” when they book',
    icon: Car,
  },
];

const NOTICE = [
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: 'A week' },
];

const DEPOSITS = [
  { value: 'none', label: 'None' },
  { value: 'fixed', label: 'A set amount' },
  { value: 'percent', label: 'A share' },
] as const;

const useStyles = makeStyles(() => ({
  group: { gap: space.sm },
  label: { marginLeft: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  fields: { gap: space.lg },
}));

/** How and where she works. More than one is normal. */
export function ServiceModelField({
  value,
  onChange,
}: {
  value: ServiceModel[];
  onChange: (models: ServiceModel[]) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <Text variant="footnote" tone="secondary" style={styles.label}>
        Where you work — pick any that fit
      </Text>
      <Section>
        {MODELS.map(model => (
          <ListRow
            key={model.value}
            title={model.label}
            subtitle={model.hint}
            icon={model.icon}
            iconTone={value.includes(model.value) ? 'accent' : 'neutral'}
            haptic="selection"
            trailing={
              <Toggle
                value={value.includes(model.value)}
                onValueChange={on =>
                  onChange(on ? [...value, model.value] : value.filter(m => m !== model.value))
                }
                accessibilityLabel={model.label}
              />
            }
            onPress={() =>
              onChange(
                value.includes(model.value)
                  ? value.filter(m => m !== model.value)
                  : [...value, model.value]
              )
            }
          />
        ))}
      </Section>
    </View>
  );
}

/** Her terms: the notice window, the deposit, and whether a first move is free. */
export function PolicyFields({
  value,
  onChange,
}: {
  value: StylistPolicies;
  onChange: (policies: StylistPolicies) => void;
}) {
  const styles = useStyles();
  const set = (changes: Partial<StylistPolicies>) => onChange({ ...value, ...changes });

  return (
    <View style={styles.fields}>
      <View style={styles.group}>
        <Text variant="footnote" tone="secondary" style={styles.label}>
          Cancelling is free up to
        </Text>
        <View style={styles.chips}>
          {NOTICE.map(option => (
            <Chip
              key={option.hours}
              label={option.label}
              selected={value.noticeHours === option.hours}
              onPress={() => set({ noticeHours: option.hours })}
            />
          ))}
        </View>
        <Text variant="caption" tone="tertiary" style={styles.label}>
          Before that, a client can cancel with no mark on their record.
        </Text>
      </View>

      <View style={styles.group}>
        <Text variant="footnote" tone="secondary" style={styles.label}>
          Deposit to hold a slot
        </Text>
        <SegmentedControl
          options={DEPOSITS}
          value={value.depositType}
          onChange={type => set({ depositType: type as DepositType })}
        />
        {value.depositType !== 'none' && (
          <Input
            label={value.depositType === 'fixed' ? 'Amount' : 'Share of the price'}
            placeholder={value.depositType === 'fixed' ? '£20' : '20%'}
            keyboardType="decimal-pad"
            value={value.depositAmount ? String(value.depositAmount) : ''}
            onChangeText={text => set({ depositAmount: Number(text.replace(/[^\d.]/g, '')) || 0 })}
          />
        )}
        <Text variant="caption" tone="tertiary" style={styles.label}>
          Clients pay you directly, with your own details. Yasante never handles this money.
        </Text>
      </View>

      <Section>
        <ListRow
          title="First change of date is free"
          subtitle="A second counts as a cancellation"
          icon={Clock}
          iconTone="neutral"
          trailing={
            <Toggle
              value={value.rescheduleFreeOnce}
              onValueChange={on => set({ rescheduleFreeOnce: on })}
              accessibilityLabel="First change of date is free"
            />
          }
        />
      </Section>
    </View>
  );
}
