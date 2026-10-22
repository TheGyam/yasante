import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { ListRow } from '@/shared/ui/ListRow';
import { Section } from '@/shared/ui/Section';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';
import { DAY_LABELS, FREQUENCY_LABELS, TIME_OF_DAY_LABELS } from '../format';
import type { CarePlanFrequency, CarePlanSchedule, TimeOfDay } from '../types';

const FREQUENCIES = (Object.keys(FREQUENCY_LABELS) as CarePlanFrequency[]).map(value => ({
  value,
  label: FREQUENCY_LABELS[value],
}));
const TIMES = (Object.keys(TIME_OF_DAY_LABELS) as TimeOfDay[]).map(value => ({
  value,
  label: TIME_OF_DAY_LABELS[value],
}));

const useStyles = makeStyles(t => ({
  body: { gap: space.lg, paddingBottom: space.lg },
  head: { gap: space.xs },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
    marginBottom: space.xs,
  },
  group: { gap: space.sm },
  label: { marginLeft: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { gap: space.xs },
}));

/**
 * Making someone else's hers: her own version, to change as she likes, no longer
 * updated by its author. One tap, no form: she can rename it after.
 */
export function MakeItYoursSheet({
  visible,
  onClose,
  name,
  authorName,
  what,
  onConfirm,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  authorName: string;
  /** "the 14 looks", "the 5 steps" */
  what: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body} testID="make-it-yours-sheet">
        <View style={styles.head}>
          <View style={styles.badge}>
            <Sparkles size={22} color={theme.colors.accent} />
          </View>
          <Text variant="title3">Make {name} yours?</Text>
          <Text variant="subhead" tone="secondary">
            You’ll get your own version of {what} to change as you like. It won’t change when{' '}
            {authorName} updates hers.
          </Text>
          <Text variant="footnote" tone="tertiary">
            Only you can see it until you share it.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            label="Make it yours"
            onPress={onConfirm}
            loading={busy}
            fullWidth
            testID="make-it-yours-confirm"
          />
          <Button label="Not now" variant="ghost" onPress={onClose} fullWidth />
        </View>
      </View>
    </Sheet>
  );
}

/**
 * Her own rhythm for a plan: starting from the author's when she follows it, and
 * hers to change at any time after. The steps aren't here: they're the author's.
 */
export function ScheduleSheet({
  visible,
  onClose,
  title,
  intro,
  initial,
  confirmLabel,
  onConfirm,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  intro: string;
  initial: CarePlanSchedule;
  confirmLabel: string;
  onConfirm: (schedule: CarePlanSchedule) => void;
  busy?: boolean;
}) {
  const styles = useStyles();
  const [schedule, setSchedule] = useState(initial);
  // Each opening starts from what she has now.
  useEffect(() => {
    if (visible) setSchedule(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const set = <K extends keyof CarePlanSchedule>(key: K, value: CarePlanSchedule[K]) =>
    setSchedule(current => ({ ...current, [key]: value }));
  const days = schedule.specificDays ?? [];
  const needsDays = schedule.frequency === 'specific-days' && !days.length;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body} testID="schedule-sheet">
        <View style={styles.head}>
          <Text variant="title3">{title}</Text>
          <Text variant="subhead" tone="secondary">
            {intro}
          </Text>
        </View>

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary" style={styles.label}>
            How often
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {FREQUENCIES.map(option => (
              <Chip
                key={option.value}
                label={option.label}
                selected={schedule.frequency === option.value}
                onPress={() => set('frequency', option.value)}
              />
            ))}
          </View>
        </View>

        {schedule.frequency === 'specific-days' && (
          <View style={styles.chips}>
            {DAY_LABELS.map((label, day) => (
              <Chip
                key={label}
                label={label}
                selected={days.includes(day)}
                onPress={() =>
                  set(
                    'specificDays',
                    days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort()
                  )
                }
              />
            ))}
          </View>
        )}

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary" style={styles.label}>
            When in the day
          </Text>
          <SegmentedControl
            options={TIMES}
            value={schedule.timeOfDay}
            onChange={value => set('timeOfDay', value)}
          />
        </View>

        <Section>
          <ListRow
            title="Remind me"
            subtitle="A notification when it’s due, at your time of day."
            trailing={
              <Toggle
                value={schedule.remindersOn}
                onValueChange={value => set('remindersOn', value)}
                accessibilityLabel="Remind me"
              />
            }
          />
        </Section>

        <Button
          label={confirmLabel}
          onPress={() => onConfirm(schedule)}
          disabled={needsDays}
          loading={busy}
          fullWidth
          testID="schedule-confirm"
        />
      </View>
    </Sheet>
  );
}
