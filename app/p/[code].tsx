import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CalendarClock, Droplets, Link2Off, Share as ShareIcon } from 'lucide-react-native';
import { AuthPromptModal, errorMessage, useAuth } from '@/features/auth';
import {
  AuthorLine,
  describePlan,
  FollowButton,
  FollowingSheet,
  MakeItYoursSheet,
  ScheduleSheet,
  sharedStyles,
  updatedLabel,
  useFollowCarePlan,
  useMakeCarePlanMine,
  useSharedCarePlan,
  useUnfollow,
} from '@/features/planner';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { IconButton } from '@/shared/ui/IconButton';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  card: { padding: space.xl, borderRadius: radius.xl, gap: space.lg },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  rhythm: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: t.colors.glass.fillStrong,
  },
  steps: { gap: space.md },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  number: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  stepText: { flex: 1, paddingTop: 2 },
}));

/**
 * yasante.com/p/<code>: someone's shared care plan, its steps and their rhythm.
 * Following it keeps the steps up to date and lets her set her own days and times.
 */
export default function SharedCarePlanScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useSharedCarePlan(code);
  const follow = useFollowCarePlan();
  const unfollow = useUnfollow('care-plan');
  const makeMine = useMakeCarePlanMine();
  const [sheet, setSheet] = useState<'schedule' | 'make' | 'following' | 'join' | null>(null);
  // Signed out, a tap asks her to join, and what she tapped finishes once she has.
  const [pending, setPending] = useState<(() => void) | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !pending) return;
    setPending(null);
    setSheet(null);
    pending();
  }, [isAuthenticated, pending]);

  useEffect(() => {
    if (data?.ownId) router.replace(`/care-plans/${data.ownId}`);
  }, [data?.ownId, router]);

  const fail = async (error: unknown) => {
    haptics.error();
    await notify({
      title: 'Couldn’t do that',
      message: errorMessage(error, 'Check your connection and try again.'),
    });
  };

  if (isError && !data) {
    return (
      <Screen back title="Care plan">
        <EmptyState
          icon={Link2Off}
          title="This isn’t shared any more"
          message="Its owner may have stopped sharing it or deleted it."
          actionLabel="Go home"
          onAction={() => router.replace('/home')}
        />
      </Screen>
    );
  }

  const following = !!data?.followingId;
  const signedIn = (then: () => void) => () => {
    if (isAuthenticated) return then();
    setPending(() => then);
    setSheet('join');
  };
  const first = data?.author.name.split(' ')[0] ?? '';

  return (
    <Screen
      back
      title={data?.name ?? 'Care plan'}
      titleBlock={false}
      testID="shared-care-plan"
      headerRight={
        data && (
          <IconButton
            icon={ShareIcon}
            size={36}
            accessibilityLabel="Share"
            onPress={() =>
              Share.share({
                message: `${data.name} by ${data.author.name} on Yasante: https://yasante.com/p/${code}`,
              }).catch(() => {})
            }
          />
        )
      }
    >
      {!data ? (
        isLoading && (
          <View style={styles.body}>
            <Skeleton height={300} radius={radius.xl} />
            <Skeleton height={48} />
          </View>
        )
      ) : (
        <View style={styles.body}>
          <Animated.View entering={FadeInDown.duration(280)}>
            <Glass style={styles.card}>
              <View style={styles.icon}>
                <Droplets size={26} color={theme.colors.accent} />
              </View>
              <View style={{ gap: space.md }}>
                <Text variant="title1">{data.name}</Text>
                <AuthorLine author={data.author} detail={updatedLabel(data.updatedAt)} />
                <View style={styles.rhythm}>
                  <CalendarClock size={14} color={theme.colors.text.secondary} />
                  <Text variant="footnote" tone="secondary">
                    {first}’s rhythm: {describePlan(data)}
                  </Text>
                </View>
              </View>
              <View style={styles.steps}>
                {data.steps.map((step, i) => (
                  <Animated.View
                    key={step.id}
                    entering={FadeIn.delay(120 + i * 40).duration(220)}
                    style={styles.step}
                  >
                    <View style={styles.number}>
                      <Text variant="footnote" tone="accent">
                        {i + 1}
                      </Text>
                    </View>
                    <Text variant="body" style={styles.stepText}>
                      {step.text}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            </Glass>
          </Animated.View>

          <View style={sharedStyles.actions}>
            <FollowButton
              following={following}
              onPress={
                following ? () => setSheet('following') : signedIn(() => setSheet('schedule'))
              }
              loading={follow.isPending}
              testID="shared-plan-follow"
            />
            {!following && (
              <View style={{ flex: 1 }}>
                <Button
                  label="Make it yours"
                  variant="secondary"
                  onPress={signedIn(() => setSheet('make'))}
                  fullWidth
                />
              </View>
            )}
          </View>
          {following && data.followingId && (
            <Animated.View entering={FadeIn}>
              <Button
                label="Open in your Planner"
                variant="ghost"
                onPress={() => router.push(`/care-plans/${data.followingId}`)}
                fullWidth
              />
            </Animated.View>
          )}

          <ScheduleSheet
            visible={sheet === 'schedule'}
            onClose={() => setSheet(null)}
            title="When will you do it?"
            intro={`Starting from ${first}’s rhythm. Change anything: the steps stay hers, the schedule is yours.`}
            initial={{
              frequency: data.frequency,
              specificDays: data.specificDays,
              timeOfDay: data.timeOfDay,
              remindersOn: true,
            }}
            confirmLabel="Tag along"
            busy={follow.isPending}
            onConfirm={schedule =>
              follow.mutate(
                { code, schedule },
                {
                  onSuccess: () => {
                    setSheet(null);
                    haptics.success();
                  },
                  onError: fail,
                }
              )
            }
          />
          <MakeItYoursSheet
            visible={sheet === 'make'}
            onClose={() => setSheet(null)}
            name={data.name}
            authorName={first}
            what={`the ${data.steps.length} steps`}
            busy={makeMine.isPending}
            onConfirm={() =>
              makeMine.mutate(
                { from: following ? { id: data.followingId } : { code }, name: data.name },
                {
                  onSuccess: mine => {
                    setSheet(null);
                    haptics.success();
                    router.replace(`/care-plans/${mine.id}`);
                  },
                  onError: fail,
                }
              )
            }
          />
          <FollowingSheet
            visible={sheet === 'following'}
            onClose={() => setSheet(null)}
            authorName={first}
            onMakeItYours={() => setSheet('make')}
            onUnfollow={async () => {
              setSheet(null);
              const yes = await confirm({
                title: `Stop tagging along with ${data.name}?`,
                message:
                  'It leaves your Planner, with your history of it. You can tag along again from the link.',
                confirmLabel: 'Stop tagging along',
                destructive: true,
              });
              if (yes && data.followingId) unfollow.mutate(data.followingId, { onError: fail });
            }}
          />
        </View>
      )}
      <AuthPromptModal visible={sheet === 'join'} onClose={() => setSheet(null)} feature="shared" />
    </Screen>
  );
}
