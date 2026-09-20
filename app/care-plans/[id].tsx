import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { format, isToday } from 'date-fns';
import { Check, CircleCheck, Pencil, Trash2 } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  describePlan,
  dueLabel,
  useCarePlanSessions,
  useCarePlans,
  useDeleteCarePlan,
  useLogCarePlanSession,
} from '@/features/planner';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { Rise } from '@/shared/ui/Rise';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  head: { gap: space.xs },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/** One care plan: its steps, when it's next due, and every time it was followed. */
export default function CarePlanScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: plans, isLoading } = useCarePlans();
  const plan = plans?.find(item => item.id === id);
  const { data: sessions = [] } = useCarePlanSessions(id);

  const log = useLogCarePlanSession(id);
  const doneToday = !!plan?.lastDoneAt && isToday(new Date(plan.lastDoneAt));
  const remove = useDeleteCarePlan();

  const markDone = async () => {
    try {
      await log.mutateAsync(undefined);
      haptics.success();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t save that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  const confirmDelete = async () => {
    const yes = await confirm({
      title: `Delete ${plan?.name ?? 'this plan'}?`,
      message: 'Its steps and the record of when you followed it go with it.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!yes) return;
    try {
      await remove.mutateAsync(id);
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t delete it',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen
      title={plan?.name ?? 'Care plan'}
      back
      testID="care-plan-screen"
      headerRight={
        plan && (
          <IconButton
            icon={Pencil}
            size={36}
            accessibilityLabel="Edit this plan"
            onPress={() => router.push(`/care-plans/edit?id=${plan.id}`)}
          />
        )
      }
    >
      {isLoading || !plan ? (
        <Skeleton height={220} />
      ) : (
        <View style={styles.body}>
          <View style={styles.head}>
            <Text variant="title2" accessibilityRole="header">
              {plan.name}
            </Text>
            {/* Keyed on the date: marking it done replays the arrival, so the thing
                that changed is the thing that moves. */}
            <Rise key={dueLabel(plan)}>
              <Text variant="subhead" tone="secondary">
                {describePlan(plan)} · {dueLabel(plan)}
              </Text>
            </Rise>
          </View>

          <Section title="Steps">
            {plan.steps.map((step, index) => (
              <ListRow key={step.id} title={`${index + 1}. ${step.text}`} />
            ))}
          </Section>

          <Button
            label={doneToday ? 'Done today' : 'I did this today'}
            icon={Check}
            variant={doneToday ? 'secondary' : 'primary'}
            onPress={markDone}
            // Pressing again would log the same day twice and tell her the plan is
            // due a week from the second tap.
            disabled={doneToday}
            loading={log.isPending}
            fullWidth
            testID="care-plan-done"
          />

          {sessions.length > 0 && (
            <Section title="When you followed it" footer="Kept as a record, never edited.">
              {sessions.slice(0, 10).map(session => (
                <Rise key={session.id}>
                  <ListRow
                    title={format(new Date(session.completedAt), 'EEEE d MMMM')}
                    subtitle={session.notes}
                    icon={CircleCheck}
                    iconTone="success"
                  />
                </Rise>
              ))}
            </Section>
          )}

          <View style={styles.footer}>
            <Button
              label="Delete plan"
              icon={Trash2}
              variant="danger"
              onPress={confirmDelete}
              loading={remove.isPending}
              fullWidth
            />
          </View>
        </View>
      )}
    </Screen>
  );
}
