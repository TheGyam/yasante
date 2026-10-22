import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Droplets } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  DAY_LABELS,
  FREQUENCY_LABELS,
  StepList,
  TIME_OF_DAY_LABELS,
  formFromPlan,
  planFromForm,
  useCarePlans,
  useCreateCarePlan,
  useUpdateCarePlan,
  validatePlan,
  type CarePlanFrequency,
  type TimeOfDay,
} from '@/features/planner';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';

const FREQUENCIES = (Object.keys(FREQUENCY_LABELS) as CarePlanFrequency[]).map(value => ({
  value,
  label: FREQUENCY_LABELS[value],
}));

const TIMES = (Object.keys(TIME_OF_DAY_LABELS) as TimeOfDay[]).map(value => ({
  value,
  label: TIME_OF_DAY_LABELS[value],
}));

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  group: { gap: space.sm },
  label: { marginLeft: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/** Writing a care plan, or editing one: `/care-plans/edit` blank, `?id=` to change one. */
export default function CarePlanFormScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const { data: plans } = useCarePlans();
  const existing = editing ? plans?.find(plan => plan.id === id) : undefined;

  const [form, setForm] = useState(() => formFromPlan(existing));
  const [errors, setErrors] = useState<ReturnType<typeof validatePlan>>({});

  // Opened from a link, the plan can arrive after the form does. Fill it once, so
  // whatever she has already typed survives.
  const filled = useRef(!editing);
  useEffect(() => {
    if (filled.current || !existing) return;
    filled.current = true;
    setForm(formFromPlan(existing));
  }, [existing]);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    if (errors[key]) setErrors(current => ({ ...current, [key]: undefined }));
  };

  const create = useCreateCarePlan();
  const update = useUpdateCarePlan(id ?? '');

  const save = async () => {
    const found = validatePlan(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      const draft = planFromForm(form);
      await (editing ? update.mutateAsync(draft) : create.mutateAsync(draft));
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t save that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  const toggleDay = (day: number) =>
    set(
      'specificDays',
      form.specificDays.includes(day)
        ? form.specificDays.filter(d => d !== day)
        : [...form.specificDays, day]
    );

  return (
    <Screen
      title={editing ? 'Edit care plan' : 'New care plan'}
      modal
      keyboard
      testID="care-plan-form"
    >
      <View style={styles.body}>
        <Input
          label="What is this plan?"
          icon={Droplets}
          value={form.name}
          onChangeText={text => set('name', text)}
          placeholder="Wash day"
          error={errors.name}
          autoCapitalize="sentences"
        />

        <StepList steps={form.steps} onChange={steps => set('steps', steps)} error={errors.steps} />

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary" style={styles.label}>
            How often
          </Text>
          {/* Four longer names don't fit four across: chips wrap, so none is cut off. */}
          <View style={styles.chips} accessibilityRole="radiogroup">
            {FREQUENCIES.map(option => (
              <Chip
                key={option.value}
                label={option.label}
                selected={form.frequency === option.value}
                onPress={() => set('frequency', option.value)}
              />
            ))}
          </View>
        </View>

        {form.frequency === 'specific-days' && (
          <View style={styles.group}>
            <View style={styles.chips}>
              {DAY_LABELS.map((label, day) => (
                <Chip
                  key={label}
                  label={label}
                  selected={form.specificDays.includes(day)}
                  onPress={() => toggleDay(day)}
                />
              ))}
            </View>
            {!!errors.specificDays && (
              <Text variant="footnote" tone="danger" style={styles.label}>
                {errors.specificDays}
              </Text>
            )}
          </View>
        )}

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary" style={styles.label}>
            When in the day
          </Text>
          <SegmentedControl
            options={TIMES}
            value={form.timeOfDay}
            onChange={value => set('timeOfDay', value)}
          />
        </View>

        <Section footer="Reminders are sent by Yasante when a plan is due.">
          <ListRow
            title="Remind me"
            trailing={
              <Toggle
                value={form.remindersOn}
                onValueChange={value => set('remindersOn', value)}
                accessibilityLabel="Remind me"
              />
            }
          />
        </Section>

        <View style={styles.footer}>
          <Button
            label={editing ? 'Save changes' : 'Save plan'}
            onPress={save}
            loading={create.isPending || update.isPending}
            fullWidth
            testID="care-plan-save"
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
