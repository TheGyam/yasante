import { useState } from 'react';
import { View } from 'react-native';
import { Bell, Calendar, Timer } from 'lucide-react-native';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Section } from '@/shared/ui/Section';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';
import { FREQUENCY_LABELS, TIME_OF_DAY_LABELS } from '../format';
import { validateTreatment, type TreatmentDraft } from '../treatmentDraft';
import type { TreatmentFrequency, TreatmentTimeOfDay } from '../types';

export interface TreatmentFormProps {
  initial: TreatmentDraft;
  submitLabel: string;
  pending: boolean;
  onSubmit: (draft: TreatmentDraft) => void;
  onDelete?: () => void;
}

const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as TreatmentFrequency[];
const TIMES = (Object.keys(TIME_OF_DAY_LABELS) as TreatmentTimeOfDay[]).map(value => ({
  value,
  label: TIME_OF_DAY_LABELS[value],
}));
// Monday first, stored the API's way: Sunday = 0.
const WEEKDAYS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

const useStyles = makeStyles(() => ({
  form: { gap: space.xxl },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { gap: space.sm },
}));

export function TreatmentForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onDelete,
}: TreatmentFormProps) {
  const styles = useStyles();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<ReturnType<typeof validateTreatment>>({});

  const set = <K extends keyof TreatmentDraft>(key: K, value: TreatmentDraft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const toggleDay = (day: number) =>
    set(
      'specificDays',
      draft.specificDays.includes(day)
        ? draft.specificDays.filter(d => d !== day)
        : [...draft.specificDays, day]
    );

  const submit = () => {
    const found = validateTreatment(draft);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(draft);
  };

  return (
    <View style={styles.form}>
      <Input
        label="Treatment"
        placeholder="Protein mask, scalp oil…"
        value={draft.name}
        onChangeText={text => set('name', text)}
        error={errors.name}
        maxLength={60}
      />

      <View style={styles.group}>
        <Text variant="overline" tone="tertiary">
          How often
        </Text>
        <View style={styles.chips}>
          {FREQUENCIES.map(value => (
            <Chip
              key={value}
              label={FREQUENCY_LABELS[value]}
              selected={draft.frequency === value}
              onPress={() => set('frequency', value)}
            />
          ))}
        </View>
      </View>

      {draft.frequency === 'specific-days' && (
        <View style={styles.group}>
          <View style={styles.chips}>
            {WEEKDAYS.map(({ day, label }) => (
              <Chip
                key={day}
                label={label}
                selected={draft.specificDays.includes(day)}
                onPress={() => toggleDay(day)}
              />
            ))}
          </View>
          {errors.specificDays && (
            <Text variant="footnote" tone="danger">
              {errors.specificDays}
            </Text>
          )}
        </View>
      )}

      {draft.frequency === 'custom' && (
        <Input
          label="Your schedule"
          placeholder="Twice a month"
          value={draft.customFrequency}
          onChangeText={text => set('customFrequency', text)}
          error={errors.customFrequency}
        />
      )}

      <View style={styles.group}>
        <Text variant="overline" tone="tertiary">
          Time of day
        </Text>
        <SegmentedControl
          options={TIMES}
          value={draft.timeOfDay}
          onChange={value => set('timeOfDay', value)}
        />
      </View>

      <Section>
        <DateTimeField
          title="Starts"
          icon={Calendar}
          value={draft.startDate}
          onChange={value => set('startDate', value)}
        />
        <ListRow
          title="Remind me"
          icon={Bell}
          iconTone="gold"
          trailing={
            <Toggle
              value={draft.reminderEnabled}
              onValueChange={value => set('reminderEnabled', value)}
              accessibilityLabel="Remind me"
            />
          }
        />
      </Section>

      <Input
        label="Minutes per session"
        placeholder="Optional"
        icon={Timer}
        keyboardType="number-pad"
        value={draft.duration}
        onChangeText={text => set('duration', text.replace(/\D/g, ''))}
        maxLength={3}
      />
      <Input
        label="Notes"
        placeholder="Products, steps, anything to remember"
        multiline
        value={draft.notes}
        onChangeText={text => set('notes', text)}
      />

      <View style={styles.actions}>
        <Button label={submitLabel} onPress={submit} loading={pending} haptic="success" fullWidth />
        {onDelete && (
          <Button label="Delete treatment" variant="danger" onPress={onDelete} fullWidth />
        )}
      </View>
    </View>
  );
}
