import { useEffect, useRef, type ReactNode } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  CalendarPlus,
  Check,
  Circle,
  Navigation,
  CalendarSync,
  ClipboardCheck,
  Hourglass,
  UserCheck,
  Banknote,
  Camera,
  CalendarClock,
  MapPin,
  MessageSquareHeart,
  Scissors,
  TriangleAlert,
  Activity,
} from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  STATUS_LABELS,
  serviceLine,
  blamesClient,
  calendarLink,
  directionsLink,
  prepList,
  usePrepStore,
  cancellingIsLate,
  dayLabel,
  isLive,
  needsAttendance,
  timingText,
  useAnswerMove,
  useAnswerProposal,
  useBooking,
  useCancelBooking,
  useConfirmAttendance,
  useContest,
  useStartedOnTime,
  inSentence,
  whenLabel,
} from '@/features/booking';
import { formatDuration } from '@/features/stylist';
import { formatMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { confirm, notify } from '@/shared/ui/dialog';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StarRating } from '@/shared/ui/StarRating';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  head: { gap: space.xs },
  footer: { paddingTop: space.lg },
  ask: { gap: space.md },
  answers: { flexDirection: 'row', gap: space.sm },
  answer: { flex: 1 },
}));

/** A question the booking is waiting on her to answer, with its two answers. */
function Ask({
  title,
  message,
  children,
}: {
  title: string;
  message?: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Card>
      <View style={styles.ask}>
        <View style={{ gap: 2 }}>
          <Text variant="bodyStrong">{title}</Text>
          {!!message && (
            <Text variant="footnote" tone="secondary">
              {message}
            </Text>
          )}
        </View>
        <View style={styles.answers}>{children}</View>
      </View>
    </Card>
  );
}

/** One booking, from the client's side: where it is, and what she does next. */
export default function BookingScreen() {
  const styles = useStyles();
  const router = useRouter();
  // `cancel=1` arrives from the reminder's "I can't make it" button.
  const { id, cancel: fromReminder } = useLocalSearchParams<{ id: string; cancel?: string }>();
  const { data: booking, isLoading } = useBooking(id);
  const cancel = useCancelBooking();
  const answerProposal = useAnswerProposal();
  const attending = useConfirmAttendance();
  const answerMove = useAnswerMove();
  const onTime = useStartedOnTime();
  const ticked = usePrepStore(s => s.done[id] ?? []);
  const tick = usePrepStore(s => s.toggle);
  const contest = useContest();

  const act = async (action: () => Promise<unknown>, title: string) => {
    try {
      await action();
      haptics.success();
    } catch (error) {
      haptics.error();
      await notify({ title, message: errorMessage(error, 'Check your connection and try again.') });
    }
  };

  const confirmCancel = async () => {
    if (!booking) return;
    const late = cancellingIsLate(booking);
    const yes = await confirm({
      title: 'Cancel this booking?',
      message: late
        ? `It's inside ${booking.stylistName}'s ${booking.policy.noticeHours}-hour window, so it counts against you and the deposit stays with her.`
        : 'You’re in good time, so this costs you nothing.',
      confirmLabel: 'Cancel it',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (!yes) return;
    try {
      await cancel.mutateAsync({ id });
      haptics.success();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t cancel it',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  const asked = useRef(false);
  useEffect(() => {
    if (fromReminder === '1' && booking && !asked.current) {
      asked.current = true;
      if (isLive(booking)) confirmCancel();
    }
    // Once, when the booking arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  const contestIt = async (what: 'no_show' | 'timing') => {
    const yes = await confirm({
      title: what === 'no_show' ? 'Say it wasn’t a no-show?' : 'Contest this record?',
      message:
        what === 'no_show'
          ? 'Someone at Yasante looks at it, and it stays off your record while they do. You can do this once.'
          : 'It comes out of her public numbers while it’s looked at. You can do this once.',
      confirmLabel: 'Contest it',
    });
    if (yes) await act(() => contest.mutateAsync({ id, what }), 'Couldn’t send that');
  };

  if (isLoading || !booking) {
    return (
      <Screen title="Booking" back testID="booking-screen">
        <Skeleton height={240} />
      </Screen>
    );
  }

  const when = booking.scheduledFor
    ? whenLabel(booking.scheduledFor)
    : booking.requestedTimes.map(whenLabel).join(' · ');

  return (
    <Screen title={booking.stylistName} back testID="booking-screen">
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="title2" accessibilityRole="header">
            {serviceLine(booking)}
          </Text>
          <Text variant="subhead" tone="secondary">
            {booking.stylistName} · {STATUS_LABELS[booking.status]}
          </Text>
        </View>

        {booking.status === 'awaiting_deposit' && !!booking.deposit && (
          <InlineAlert
            tone="info"
            message={`Send ${formatMoney(booking.deposit.amount)} to ${booking.stylistName} directly, ${booking.deposit.method || 'using the details she gave you'}${booking.expiresAt ? `, by ${inSentence(whenLabel(booking.expiresAt))}` : ''}. Yasante never handles this payment. She marks it received, and that confirms your booking.`}
          />
        )}

        {booking.status === 'requested' && booking.proposal && (
          <Ask
            title={`${booking.stylistName} suggested ${inSentence(whenLabel(booking.proposal.scheduledFor))}`}
            message={
              booking.proposal.deposit
                ? `None of your days worked. Say yes and she'll ask for a ${formatMoney(booking.proposal.deposit.amount)} deposit.`
                : 'None of your days worked. Say yes and it’s confirmed.'
            }
          >
            <Button
              label="That works"
              size="sm"
              onPress={() =>
                act(() => answerProposal.mutateAsync({ id, accept: true }), 'Couldn’t answer')
              }
              loading={answerProposal.isPending}
              style={styles.answer}
              testID="proposal-accept"
            />
            <Button
              label="It doesn’t"
              size="sm"
              variant="secondary"
              onPress={() =>
                act(() => answerProposal.mutateAsync({ id, accept: false }), 'Couldn’t answer')
              }
              style={styles.answer}
            />
          </Ask>
        )}

        {booking.status === 'requested' && !booking.proposal && (
          <InlineAlert
            message={`With her now. She has until ${booking.expiresAt ? whenLabel(booking.expiresAt) : 'two days from now'} to accept, suggest another time, or say no.`}
          />
        )}

        {needsAttendance(booking) && (
          <Ask
            title={`Still coming ${dayLabel(booking.scheduledFor!).toLowerCase()}?`}
            message={`${booking.stylistName} is keeping the time for you. A quick yes lets her plan.`}
          >
            <Button
              label="Yes, I’m coming"
              size="sm"
              onPress={() => act(() => attending.mutateAsync(id), 'Couldn’t send that')}
              loading={attending.isPending}
              style={styles.answer}
              testID="attendance-yes"
            />
            <Button
              label="I can’t make it"
              size="sm"
              variant="secondary"
              onPress={confirmCancel}
              style={styles.answer}
              testID="attendance-no"
            />
          </Ask>
        )}

        {booking.moveRequest?.by === 'stylist' && (
          <Ask
            title={`${booking.stylistName} asked to move it to ${inSentence(whenLabel(booking.moveRequest.scheduledFor))}`}
            message="Your deposit and history carry over."
          >
            <Button
              label="Move it"
              size="sm"
              onPress={() =>
                act(() => answerMove.mutateAsync({ id, accept: true }), 'Couldn’t answer')
              }
              loading={answerMove.isPending}
              style={styles.answer}
              testID="move-accept"
            />
            <Button
              label="Keep my time"
              size="sm"
              variant="secondary"
              onPress={() =>
                act(() => answerMove.mutateAsync({ id, accept: false }), 'Couldn’t answer')
              }
              style={styles.answer}
            />
          </Ask>
        )}
        {booking.moveRequest?.by === 'client' && (
          <InlineAlert
            message={`You asked to move it to ${inSentence(whenLabel(booking.moveRequest.scheduledFor))}. Until she agrees, it stays where it is.`}
          />
        )}

        {booking.status === 'completed' && booking.startedOnTime === undefined && (
          <Ask title="Did it start on time?" message="One tap. It keeps everyone’s numbers fair.">
            <Button
              label="Yes"
              size="sm"
              variant="secondary"
              onPress={() =>
                act(() => onTime.mutateAsync({ id, onTime: true }), 'Couldn’t send that')
              }
              style={styles.answer}
              testID="on-time-yes"
            />
            <Button
              label="No"
              size="sm"
              variant="secondary"
              onPress={() =>
                act(() => onTime.mutateAsync({ id, onTime: false }), 'Couldn’t send that')
              }
              style={styles.answer}
              testID="on-time-no"
            />
          </Ask>
        )}

        <Section>
          <ListRow
            title={when}
            subtitle={booking.scheduledFor ? undefined : 'The days you asked for, in order'}
            icon={CalendarClock}
          />
          <ListRow
            title={booking.serviceName}
            subtitle={booking.durationMinutes ? formatDuration(booking.durationMinutes) : undefined}
            value={`${booking.fromPrice ? 'from ' : ''}${formatMoney(booking.price)}`}
            icon={Scissors}
          />
          <ListRow
            title={booking.address ?? booking.area}
            subtitle={
              booking.address ? 'The full address' : 'The address arrives once she confirms'
            }
            icon={MapPin}
            iconTone={booking.address ? 'success' : 'neutral'}
          />
          {booking.status === 'confirmed' && !!booking.attendanceConfirmedAt && (
            <ListRow title="You said you’re coming" icon={UserCheck} iconTone="success" />
          )}
          {(booking.status === 'requested' || booking.status === 'awaiting_deposit') &&
            !!booking.expiresAt && (
              <ListRow
                title={`Lapses ${inSentence(whenLabel(booking.expiresAt))}`}
                subtitle={
                  booking.status === 'requested'
                    ? 'If there’s no answer by then, it closes on its own'
                    : 'If the deposit hasn’t arrived by then, the slot is released'
                }
                icon={Hourglass}
                iconTone="neutral"
              />
            )}
          {!!booking.deposit && (
            <ListRow
              title={
                booking.deposit.status === 'received'
                  ? 'Deposit received'
                  : `${formatMoney(booking.deposit.amount)} deposit due`
              }
              subtitle={booking.deposit.method || undefined}
              icon={booking.deposit.status === 'received' ? BadgeCheck : Banknote}
              iconTone={booking.deposit.status === 'received' ? 'success' : 'gold'}
            />
          )}
        </Section>

        {booking.status === 'confirmed' && (
          <>
            <Section>
              {!!calendarLink(booking) && (
                <ListRow
                  title="Add to calendar"
                  icon={CalendarPlus}
                  onPress={() => Linking.openURL(calendarLink(booking)!).catch(() => {})}
                  testID="booking-calendar"
                />
              )}
              {!!booking.address && (
                <ListRow
                  title="Directions"
                  subtitle={booking.address}
                  icon={Navigation}
                  onPress={() =>
                    Linking.openURL(directionsLink(booking.address!, Platform.OS)).catch(() => {})
                  }
                  testID="booking-directions"
                />
              )}
            </Section>

            <Section
              title="Before the day"
              footer={
                ticked.length >= prepList(booking).length
                  ? 'All set. She’ll be glad of it.'
                  : 'Tick them off as you go. Only you see this.'
              }
            >
              {prepList(booking).map(item => {
                const done = ticked.includes(item.id);
                return (
                  <ListRow
                    key={item.id}
                    title={item.text}
                    icon={done ? Check : Circle}
                    iconTone={done ? 'success' : 'neutral'}
                    haptic="selection"
                    onPress={() => tick(id, item.id)}
                    accessibilityLabel={`${item.text}, ${done ? 'done' : 'not done'}`}
                    trailing={<View />}
                    testID={`prep-${item.id}`}
                  />
                );
              })}
            </Section>
          </>
        )}

        {!!booking.notes && (
          <Section title="What you told her">
            <ListRow title={booking.notes} />
          </Section>
        )}

        {!!booking.reason && (
          <Section title="What she said">
            <ListRow title={booking.reason} icon={TriangleAlert} iconTone="neutral" />
          </Section>
        )}

        {booking.status === 'completed' && !!booking.timing && (
          <Section
            title="How she recorded it"
            footer={
              booking.contested?.timing
                ? 'You contested this, so it’s out of her public numbers.'
                : undefined
            }
          >
            <ListRow title={timingText(booking.timing)!} icon={ClipboardCheck} iconTone="neutral" />
            {blamesClient(booking.timing) && !booking.contested?.timing && (
              <ListRow
                title="That’s not what happened"
                icon={TriangleAlert}
                onPress={() => contestIt('timing')}
                testID="contest-timing"
              />
            )}
          </Section>
        )}

        {booking.status === 'no_show' && (
          <Section
            footer={
              booking.contested?.noShow
                ? 'You’ve contested this. It stays off your record while it’s looked at.'
                : 'If you were there, say so. You can do this once.'
            }
          >
            {!booking.contested?.noShow && (
              <ListRow
                title="I wasn’t a no-show"
                icon={TriangleAlert}
                onPress={() => contestIt('no_show')}
                testID="contest-no-show"
              />
            )}
          </Section>
        )}

        {isLive(booking) && (
          <View style={styles.footer}>
            {booking.status === 'confirmed' && !booking.moves && !booking.moveRequest && (
              <Button
                label="Move it"
                icon={CalendarSync}
                variant="secondary"
                onPress={() => router.push(`/bookings/move?id=${id}`)}
                fullWidth
                style={{ marginBottom: space.sm }}
                testID="booking-move"
              />
            )}
            <Button
              label="Cancel this booking"
              variant="danger"
              onPress={confirmCancel}
              loading={cancel.isPending}
              fullWidth
              testID="booking-cancel"
            />
            <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: space.sm }}>
              {cancellingIsLate(booking)
                ? 'Cancelling now counts against you.'
                : `Free to cancel until ${booking.policy.noticeHours} hours before.`}
            </Text>
          </View>
        )}

        {booking.status === 'completed' && (
          <Section title="After the appointment">
            {!!booking.checkInDue && (
              <ListRow
                title={`Week ${booking.checkInDue} check-in`}
                subtitle="How it's holding up, in three taps"
                icon={Activity}
                onPress={() => router.push(`/check-in/${booking.id}`)}
                testID="booking-check-in"
              />
            )}
            {booking.review ? (
              <ListRow
                title="Your review"
                subtitle={
                  booking.review.status === 'published'
                    ? 'On her page'
                    : booking.review.status === 'pending'
                      ? 'Being checked before it goes up'
                      : 'Taken down by moderation'
                }
                trailing={<StarRating value={booking.review.rating} size={12} />}
                icon={MessageSquareHeart}
                iconTone="success"
              />
            ) : (
              <ListRow
                title="Leave a review"
                subtitle="It helps the next person choose"
                icon={MessageSquareHeart}
                onPress={() => router.push(`/review/${booking.id}`)}
                testID="booking-review"
              />
            )}
            <ListRow
              title="Post this as a look"
              icon={Camera}
              onPress={() => router.push(`/looks/new?bookingId=${booking.id}`)}
            />
          </Section>
        )}
      </View>
    </Screen>
  );
}
