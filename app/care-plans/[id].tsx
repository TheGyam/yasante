import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { format, isToday } from 'date-fns';
import Animated, {
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  CalendarClock,
  Check,
  ChevronDown,
  CircleCheck,
  CircleMinus,
  Clock,
  Pencil,
  Share as ShareIcon,
  Trash2,
} from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  AuthorLine,
  consistency,
  describePlan,
  dueLabel,
  MakeItYoursSheet,
  recentDays,
  ScheduleSheet,
  ShareSheet,
  updatedLabel,
  useCarePlanSessions,
  useCarePlans,
  useDeleteCarePlan,
  useLogCarePlanSession,
  useMakeCarePlanMine,
  useShareCarePlan,
  useUpdateCarePlan,
} from '@/features/planner';
import { useNeedsUsername } from '@/features/profile';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, makeStyles, radius, space, spring, timing, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { Glass } from '@/shared/ui/Glass';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { Confetti, Flip, Pop, Tilt } from '@/shared/ui/Motion';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Rise } from '@/shared/ui/Rise';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { SEP } from '@/shared/lib/format';

/** History arrives five at a time: the recent ones matter, the rest are a tap away. */
const PAGE = 5;
const RING = 124;
const STROKE = 10;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  headerActions: { flexDirection: 'row', gap: space.sm },
  source: {
    gap: space.sm,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
  },
  sourceLink: { marginTop: space.xs },
  hero: { borderRadius: radius.xl },
  face: { padding: space.xl, borderRadius: radius.xl, alignItems: 'center', gap: space.md },
  ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringCentre: { position: 'absolute', alignItems: 'center' },
  count: { fontSize: 38, lineHeight: 42 },
  due: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: t.colors.accentSoft,
  },
  doneTick: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.successSoft,
  },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dot: { width: 13, height: 13, borderRadius: 7, backgroundColor: t.colors.glass.fillStrong },
  dotDone: { backgroundColor: t.colors.accent },
  dotToday: { borderWidth: 2, borderColor: t.colors.accent },
  steps: { gap: space.sm },
  block: { gap: space.sm },
  blockTitle: { marginLeft: space.xs },
  blockCard: { paddingHorizontal: space.lg, paddingVertical: space.md },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.glass.fillStrong,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: t.colors.success,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: t.colors.glass.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: t.colors.success, borderColor: t.colors.success },
  stepText: { flex: 1 },
  stepDone: { textDecorationLine: 'line-through', color: t.colors.text.tertiary },
  footer: { gap: space.xs, paddingTop: space.lg },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.md,
  },
}));

/** The ring fills to how consistent she's been: drawn on the UI thread, never by React. */
function ConsistencyRing({ share }: { share: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const r = (RING - STROKE) / 2;
  const length = 2 * Math.PI * r;
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(
      reduced ? share : withDelay(150, withTiming(share, { duration: 900, easing: EASE_OUT }))
    );
  }, [share, reduced, shown]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - shown.get()) }));
  return (
    <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={theme.colors.glass.fillStrong}
        strokeWidth={STROKE}
        fill="none"
      />
      <AnimatedCircle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={theme.colors.accent}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={length}
        animatedProps={arc}
        // Start at twelve o'clock, not three.
        rotation={-90}
        origin={`${RING / 2}, ${RING / 2}`}
      />
    </Svg>
  );
}

/** Steps as a checklist for today: tick them off as she goes; the bar fills with her. */
function StepList({
  steps,
  resetKey,
  onAllDone,
}: {
  steps: { id: string; text: string }[];
  resetKey: string;
  onAllDone: () => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  // A new day, or a new set of steps, starts clean.
  useEffect(() => setTicked(new Set()), [resetKey]);

  const progress = useSharedValue(0);
  const width = useSharedValue(0);
  const share = steps.length ? ticked.size / steps.length : 0;
  useEffect(() => {
    progress.set(withSpring(share, spring.snap));
  }, [share, progress]);
  // Width on an absolute, childless bar: nothing else re-lays out.
  const fillStyle = useAnimatedStyle(() => ({ width: width.get() * progress.get() }));

  const toggle = (id: string) => {
    const next = new Set(ticked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTicked(next);
    haptics.selection();
    if (next.size === steps.length && ticked.size !== steps.length) onAllDone();
  };

  return (
    <View style={styles.steps}>
      <View style={styles.track} onLayout={e => width.set(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <View>
        {steps.map((step, index) => {
          const on = ticked.has(step.id);
          return (
            <PressableScale
              key={step.id}
              onPress={() => toggle(step.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Step ${index + 1}: ${step.text}`}
              scaleTo={0.98}
              style={styles.step}
            >
              <Pop trigger={on ? `${step.id}-on` : undefined}>
                <View style={[styles.box, on && styles.boxOn]}>
                  {on && (
                    <Animated.View entering={ZoomIn.duration(180).easing(EASE_OUT)}>
                      <Check size={16} color={theme.colors.text.onAccent} strokeWidth={3} />
                    </Animated.View>
                  )}
                </View>
              </Pop>
              <Text variant="body" style={[styles.stepText, on && styles.stepDone]}>
                {step.text}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

/** A labelled glass card with room inside, for content that isn't a list of rows. */
function Block({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.block}>
      <Text variant="overline" tone="tertiary" style={styles.blockTitle}>
        {title}
      </Text>
      <Glass style={styles.blockCard}>{children}</Glass>
    </View>
  );
}

/** One care plan: how it's going, today's steps, and every time it was followed. */
export default function CarePlanScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: plans, isLoading } = useCarePlans();
  const plan = plans?.find(item => item.id === id);
  const { data: sessions = [] } = useCarePlanSessions(id);
  const needsUsername = useNeedsUsername();
  const share = useShareCarePlan(id);
  const reschedule = useUpdateCarePlan(id);
  const makeMine = useMakeCarePlanMine();
  const [sheet, setSheet] = useState<'share' | 'schedule' | 'make' | null>(null);
  const following = plan?.following;
  const first = following?.author.name.split(' ')[0] ?? '';

  const log = useLogCarePlanSession(id);
  const doneToday = !!plan?.lastDoneAt && isToday(new Date(plan.lastDoneAt));
  const remove = useDeleteCarePlan();
  const [shown, setShown] = useState(PAGE);
  const [celebrate, setCelebrate] = useState(0);
  const [ready, setReady] = useState(0);

  const stats = useMemo(
    () => (plan ? consistency(plan, sessions) : { done: 0, share: 0 }),
    [plan, sessions]
  );
  const days = useMemo(() => recentDays(sessions), [sessions]);

  const markDone = async () => {
    try {
      await log.mutateAsync(undefined);
      haptics.success();
      // The card turns over to "done" and a little confetti goes up: once a day at most.
      setCelebrate(c => c + 1);
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t save that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  const confirmDelete = async () => {
    const yes = await confirm(
      following
        ? {
            title: `Stop tagging along with ${plan?.name ?? 'this plan'}?`,
            message: 'It leaves your Planner, with your record of when you followed it.',
            confirmLabel: 'Stop tagging along',
            destructive: true,
          }
        : {
            title: `Delete ${plan?.name ?? 'this plan'}?`,
            message: 'Its steps and the record of when you followed it go with it.',
            confirmLabel: 'Delete',
            destructive: true,
          }
    );
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

  const front = plan && (
    <Glass style={styles.face}>
      <View style={styles.ringWrap}>
        <ConsistencyRing share={stats.share} />
        <View style={styles.ringCentre}>
          <Text
            variant="display"
            style={styles.count}
            accessibilityLabel={`${stats.done} times in the last 30 days`}
          >
            {stats.done}
          </Text>
          <Text variant="caption" tone="secondary">
            in 30 days
          </Text>
        </View>
      </View>
      <Text variant="subhead" tone="secondary" align="center">
        {describePlan(plan)}
      </Text>
      <View style={styles.due}>
        <Clock size={14} color={theme.colors.accent} />
        <Text variant="footnote" style={{ color: theme.colors.accent }}>
          {dueLabel(plan)}
        </Text>
      </View>
    </Glass>
  );

  const back = plan && (
    <Glass style={[styles.face, StyleSheet.absoluteFill, { justifyContent: 'center' }]}>
      <View style={styles.doneTick}>
        <Check size={38} color={theme.colors.success} strokeWidth={2.8} />
      </View>
      <Text variant="title2" align="center">
        Done for today
      </Text>
      <Text variant="subhead" tone="secondary" align="center">
        {stats.done} {stats.done === 1 ? 'time' : 'times'} in 30 days{SEP}
        {dueLabel(plan).replace('Due', 'next')}
      </Text>
    </Glass>
  );

  return (
    <Screen
      title={plan?.name ?? 'Care plan'}
      back
      testID="care-plan-screen"
      headerRight={
        plan && (
          <View style={styles.headerActions}>
            {!following && (
              <IconButton
                icon={ShareIcon}
                size={36}
                accessibilityLabel="Share this plan"
                // Shared things show who made them: by username, never an email.
                onPress={() => (needsUsername ? router.push('/username') : setSheet('share'))}
                testID="care-plan-share"
              />
            )}
            <IconButton
              icon={following ? CalendarClock : Pencil}
              size={36}
              accessibilityLabel={following ? 'Change your schedule' : 'Edit this plan'}
              onPress={() =>
                following ? setSheet('schedule') : router.push(`/care-plans/edit?id=${plan.id}`)
              }
            />
          </View>
        )
      }
    >
      {isLoading || !plan ? (
        <Skeleton height={220} />
      ) : (
        <View style={styles.body}>
          <View>
            <Tilt
              style={styles.hero}
              accessibilityRole="summary"
              accessibilityLabel={doneToday ? 'Done for today' : dueLabel(plan)}
            >
              <Flip flipped={doneToday} front={front} back={back} />
            </Tilt>
            <Confetti fire={celebrate} />
          </View>

          <Block title="Last two weeks">
            <View
              style={styles.days}
              accessibilityLabel={`${days.filter(d => d.done).length} of the last 14 days`}
            >
              {days.map(({ day, done, today }, i) => (
                <Animated.View
                  key={day.toISOString()}
                  entering={FadeIn.delay(i * 25).duration(timing.enter.duration)}
                  style={styles.dayCol}
                >
                  <Pop trigger={done && today ? celebrate : undefined}>
                    <View
                      style={[
                        styles.dot,
                        done && styles.dotDone,
                        today && !done && styles.dotToday,
                      ]}
                    />
                  </Pop>
                  <Text variant="caption" tone="tertiary">
                    {format(day, 'EEEEE')}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </Block>

          <Block title="Today’s steps">
            <StepList
              steps={plan.steps}
              resetKey={`${plan.steps.map(s => s.id).join()}-${format(new Date(), 'yyyy-MM-dd')}`}
              onAllDone={() => setReady(r => r + 1)}
            />
            {following && (
              <Animated.View entering={FadeIn.delay(200)} style={styles.source}>
                <AuthorLine
                  author={following.author}
                  title={`Steps by ${following.author.name}`}
                  detail={`Kept up to date${SEP}${updatedLabel(following.updatedAt).replace('Updated ', '')}`}
                  size={32}
                />
                <Text
                  variant="footnote"
                  tone="accent"
                  onPress={() => setSheet('make')}
                  accessibilityRole="button"
                  suppressHighlighting
                  style={styles.sourceLink}
                >
                  Make it yours to change the steps
                </Text>
              </Animated.View>
            )}
            {!!plan.basedOn && (
              <Text variant="footnote" tone="secondary" style={styles.sourceLink}>
                Based on {plan.basedOn.name} by {plan.basedOn.authorName}
              </Text>
            )}
          </Block>

          {/* Ticking the last step nudges the button: that's the next thing to do. */}
          <Pop trigger={ready ? ready : undefined}>
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
          </Pop>

          {sessions.length > 0 && (
            <Section title="When you followed it" footer="Kept as a record, never edited.">
              {sessions.slice(0, shown).map((session, i) => (
                <Rise key={session.id} index={i % PAGE}>
                  <ListRow
                    title={format(new Date(session.completedAt), 'EEEE d MMMM')}
                    subtitle={session.notes}
                    wrap
                    icon={CircleCheck}
                    iconTone="success"
                  />
                </Rise>
              ))}
              {sessions.length > shown && (
                <PressableScale
                  onPress={() => setShown(n => n + PAGE)}
                  accessibilityLabel={`Show ${Math.min(PAGE, sessions.length - shown)} more`}
                  style={styles.more}
                  testID="care-plan-more"
                >
                  <Text variant="callout" style={{ color: theme.colors.accent }}>
                    Show more
                  </Text>
                  <ChevronDown size={16} color={theme.colors.accent} />
                </PressableScale>
              )}
            </Section>
          )}

          <View style={styles.footer}>
            <Button
              label={following ? 'Stop tagging along' : 'Delete plan'}
              icon={following ? CircleMinus : Trash2}
              variant="danger"
              onPress={confirmDelete}
              loading={remove.isPending}
              fullWidth
            />
          </View>
        </View>
      )}
      {plan && !following && (
        <ShareSheet
          visible={sheet === 'share'}
          onClose={() => setSheet(null)}
          kind="care-plan"
          name={plan.name}
          detail={`${plan.steps.length} ${plan.steps.length === 1 ? 'step' : 'steps'}${SEP}${describePlan(plan)}`}
          state={plan}
          busy={share.isPending}
          onChange={sharing => share.mutateAsync(sharing).catch(() => haptics.error())}
        />
      )}
      {plan && following && (
        <>
          <ScheduleSheet
            visible={sheet === 'schedule'}
            onClose={() => setSheet(null)}
            title="Your schedule"
            intro={`The steps are ${first}’s. When you do them is up to you.`}
            initial={{
              frequency: plan.frequency,
              specificDays: plan.specificDays,
              timeOfDay: plan.timeOfDay,
              remindersOn: plan.remindersOn,
            }}
            confirmLabel="Save schedule"
            busy={reschedule.isPending}
            onConfirm={schedule =>
              reschedule.mutate(schedule, {
                onSuccess: () => {
                  setSheet(null);
                  haptics.success();
                },
              })
            }
          />
          <MakeItYoursSheet
            visible={sheet === 'make'}
            onClose={() => setSheet(null)}
            name={plan.name}
            authorName={first}
            what={`the ${plan.steps.length} steps`}
            busy={makeMine.isPending}
            onConfirm={() =>
              makeMine.mutate(
                { from: { id: plan.id }, name: plan.name },
                {
                  onSuccess: mine => {
                    setSheet(null);
                    haptics.success();
                    router.replace(`/care-plans/${mine.id}`);
                  },
                }
              )
            }
          />
        </>
      )}
    </Screen>
  );
}
