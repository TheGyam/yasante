import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { isSameDay, setHours, startOfHour } from 'date-fns';
import {
  Banknote,
  CalendarClock,
  CalendarSync,
  Check,
  ClipboardCheck,
  Hourglass,
  Scissors,
  Send,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  STATUS_LABELS,
  serviceLine,
  dayLabel,
  recordLabel,
  timingText,
  useAcceptRequest,
  useAnswerMove,
  useBooking,
  useCancelBooking,
  useDeclineRequest,
  useMarkDepositReceived,
  useProposeTime,
  inSentence,
  whenLabel,
} from '@/features/booking';
import { formatDuration } from '@/features/stylist';
import { formatMoney, parseMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  head: { gap: space.xs },
  group: { gap: space.sm },
  label: { marginLeft: space.xs },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/**
 * One booking from her side, whatever state it's in: a request to take, suggest
 * another time for or decline; a deposit to mark; an appointment to move, cancel
 * or close out.
 */
export default function RequestScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(id);

  const accept = useAcceptRequest();
  const propose = useProposeTime();
  const decline = useDeclineRequest();
  const markPaid = useMarkDepositReceived();
  const answerMove = useAnswerMove();
  const cancel = useCancelBooking();

  const [when, setWhen] = useState<Date>(() => setHours(startOfHour(new Date()), 10));
  const [deposit, setDeposit] = useState('');
  const [method, setMethod] = useState('');

  // Her first choice, at a sensible hour, is the default she'll usually keep.
  useEffect(() => {
    const first = booking?.requestedTimes[0];
    if (first) setWhen(setHours(startOfHour(new Date(first)), 10));
    if (booking?.policy.depositType === 'fixed' && booking.policy.depositAmount) {
      setDeposit(String(booking.policy.depositAmount));
    }
    if (booking?.policy.depositType === 'percent' && booking.policy.depositAmount) {
      setDeposit(String(Math.round((booking.price * booking.policy.depositAmount) / 100)));
    }
  }, [booking]);

  const fail = async (error: unknown, title: string) => {
    haptics.error();
    await notify({ title, message: errorMessage(error, 'Check your connection and try again.') });
  };

  const run = async (action: () => Promise<unknown>, title: string, leave = true) => {
    try {
      await action();
      haptics.success();
      if (leave) router.back();
    } catch (error) {
      await fail(error, title);
    }
  };

  if (isLoading || !booking) {
    return (
      <Screen title="Request" back testID="request-screen">
        <Skeleton height={240} />
      </Screen>
    );
  }

  const first = booking.clientName.split(' ')[0];
  const amount = parseMoney(deposit);
  const depositArgs = amount > 0 ? { amount, method: method.trim() } : undefined;
  // A day she asked for is an answer; any other day is a suggestion she has to agree to.
  const onAskedDay = booking.requestedTimes.some(t => isSameDay(new Date(t), when));
  const started = !!booking.scheduledFor && new Date(booking.scheduledFor) <= new Date();

  const take = () =>
    run(
      () =>
        onAskedDay
          ? accept.mutateAsync({ id, scheduledFor: when.toISOString(), deposit: depositArgs })
          : propose.mutateAsync({ id, scheduledFor: when.toISOString(), deposit: depositArgs }),
      onAskedDay ? 'Couldn’t accept it' : 'Couldn’t send that'
    );

  const say = async () => {
    const yes = await confirm({
      title: `Turn down ${booking.clientName}?`,
      message: 'She’ll be told, and offered other stylists.',
      confirmLabel: 'Decline',
      destructive: true,
    });
    if (yes) await run(() => decline.mutateAsync({ id }), 'Couldn’t decline it');
  };

  const cancelIt = async () => {
    const yes = await confirm({
      title: `Cancel ${first}’s appointment?`,
      message:
        'Her deposit is always returned when you cancel, and it counts against your record. Moving it instead keeps both of you whole.',
      confirmLabel: 'Cancel it',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (yes) await run(() => cancel.mutateAsync({ id }), 'Couldn’t cancel it');
  };

  const status = booking.status;

  return (
    <Screen title={booking.clientName} back keyboard testID="request-screen">
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="title2" accessibilityRole="header">
            {serviceLine(booking)}
          </Text>
          <Text variant="subhead" tone="secondary">
            {booking.clientName} ·{' '}
            {`${booking.fromPrice ? 'from ' : ''}${formatMoney(booking.price)}`}
            {status !== 'requested' && status !== 'awaiting_deposit' && status !== 'confirmed'
              ? ` · ${STATUS_LABELS[status]}`
              : ''}
          </Text>
        </View>

        <Section title="Who's asking">
          <ListRow
            title={recordLabel(booking.clientRecord) ?? 'First booking on Yasante'}
            subtitle={booking.clientHair}
            icon={UserRound}
            iconTone={booking.clientRecord?.noShows ? 'gold' : 'success'}
          />
          <ListRow
            title={booking.serviceName}
            subtitle={booking.durationMinutes ? formatDuration(booking.durationMinutes) : undefined}
            value={booking.bringingOwnHair ? 'Own hair' : undefined}
            icon={Scissors}
          />
        </Section>

        {!!booking.notes && (
          <Section title="What she said">
            <ListRow title={booking.notes} />
          </Section>
        )}

        {status === 'requested' && booking.proposal && (
          <InlineAlert
            tone="info"
            message={`You suggested ${inSentence(whenLabel(booking.proposal.scheduledFor))}. Waiting for ${first} to say yes${booking.expiresAt ? ` — it lapses ${inSentence(whenLabel(booking.expiresAt))}` : ''}.`}
          />
        )}

        {status === 'requested' && !booking.proposal && (
          <>
            {!!booking.expiresAt && (
              <ListRow
                title={`Answer by ${inSentence(whenLabel(booking.expiresAt))}`}
                subtitle="After that it lapses, and counts against your response rate"
                icon={Hourglass}
                iconTone="gold"
              />
            )}
            <View style={styles.group}>
              <Text variant="footnote" tone="secondary" style={styles.label}>
                She asked for {booking.requestedTimes.map(dayLabel).join(', then ')}
              </Text>
              <DateTimeField title="Day" mode="date" value={when} onChange={setWhen} />
              <DateTimeField title="Start at" mode="time" value={when} onChange={setWhen} />
              {!onAskedDay && (
                <Text variant="caption" tone="accent" style={styles.label}>
                  That’s not one of her days, so she’ll be asked if it works.
                </Text>
              )}
            </View>

            <Input
              label="Deposit to confirm"
              value={deposit}
              onChangeText={setDeposit}
              placeholder="20"
              keyboardType="decimal-pad"
              hint="Leave it empty to confirm without one"
            />
            {amount > 0 && (
              <Input
                label="How she pays you"
                value={method}
                onChangeText={setMethod}
                placeholder="Bank transfer to A. Owusu, 12-34-56 · 12345678"
                hint="Shown only to her, once you accept. Yasante never handles it"
              />
            )}

            <View style={styles.footer}>
              <Button
                label={onAskedDay ? 'Accept' : 'Suggest this time'}
                icon={onAskedDay ? Check : Send}
                onPress={take}
                loading={accept.isPending || propose.isPending}
                fullWidth
                testID="request-accept"
              />
              <Button
                label="Decline"
                icon={X}
                variant="ghost"
                onPress={say}
                loading={decline.isPending}
                fullWidth
                testID="request-decline"
              />
            </View>
          </>
        )}

        {status === 'awaiting_deposit' && (
          <>
            <InlineAlert
              tone="info"
              message={`Accepted for ${inSentence(whenLabel(booking.scheduledFor ?? ''))}. She's been asked for ${formatMoney(booking.deposit?.amount ?? 0)}${booking.expiresAt ? `, and has until ${inSentence(whenLabel(booking.expiresAt))}` : ''}. Marking it received confirms the booking and shares your address.`}
            />
            <View style={styles.footer}>
              <Button
                label="The deposit arrived"
                icon={Banknote}
                onPress={() => run(() => markPaid.mutateAsync(id), 'Couldn’t confirm it')}
                loading={markPaid.isPending}
                fullWidth
                testID="request-deposit-received"
              />
            </View>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <Section>
              <ListRow
                title={whenLabel(booking.scheduledFor ?? '')}
                subtitle={booking.moves ? 'Moved once' : undefined}
                icon={CalendarClock}
                iconTone="success"
              />
              <ListRow
                title={booking.attendanceConfirmedAt ? `${first} is coming` : 'Not confirmed yet'}
                subtitle={
                  booking.attendanceConfirmedAt
                    ? 'She said yes to the reminder'
                    : 'She’s asked the day before'
                }
                icon={UserCheck}
                iconTone={booking.attendanceConfirmedAt ? 'success' : 'neutral'}
              />
            </Section>

            {booking.moveRequest?.by === 'client' && (
              <View style={styles.group}>
                <InlineAlert
                  tone="info"
                  message={`${first} asked to move it to ${inSentence(whenLabel(booking.moveRequest.scheduledFor))}. Her deposit and history carry over.`}
                />
                <Button
                  label="Move it"
                  onPress={() =>
                    run(
                      () => answerMove.mutateAsync({ id, accept: true }),
                      'Couldn’t move it',
                      false
                    )
                  }
                  loading={answerMove.isPending}
                  fullWidth
                  testID="request-move-accept"
                />
                <Button
                  label="Keep the original time"
                  variant="ghost"
                  onPress={() =>
                    run(
                      () => answerMove.mutateAsync({ id, accept: false }),
                      'Couldn’t answer',
                      false
                    )
                  }
                  fullWidth
                />
              </View>
            )}
            {booking.moveRequest?.by === 'stylist' && (
              <InlineAlert
                message={`You asked to move it to ${inSentence(whenLabel(booking.moveRequest.scheduledFor))}. Waiting for ${first}.`}
              />
            )}

            <View style={styles.footer}>
              {started && (
                <Button
                  label="Close it out"
                  icon={ClipboardCheck}
                  onPress={() => router.push(`/close-out/${id}`)}
                  fullWidth
                  testID="request-close-out"
                />
              )}
              {!started && !booking.moves && !booking.moveRequest && (
                <Button
                  label="Move it"
                  icon={CalendarSync}
                  variant="secondary"
                  onPress={() => router.push(`/bookings/move?id=${id}`)}
                  fullWidth
                  testID="request-move"
                />
              )}
              {!started && (
                <Button
                  label="Cancel the appointment"
                  variant="ghost"
                  onPress={cancelIt}
                  loading={cancel.isPending}
                  fullWidth
                />
              )}
            </View>
          </>
        )}

        {status === 'completed' && (
          <Section title="How it went">
            <ListRow
              title={timingText(booking.timing) ?? 'No timing recorded'}
              subtitle={booking.contested?.timing ? 'She contested this' : undefined}
              icon={ClipboardCheck}
            />
            {!!booking.actualPrice && (
              <ListRow title="Paid" value={formatMoney(booking.actualPrice)} icon={Banknote} />
            )}
          </Section>
        )}
      </View>
    </Screen>
  );
}
