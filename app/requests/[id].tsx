import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { setHours, startOfHour } from 'date-fns';
import {
  Banknote,
  CalendarClock,
  CalendarSync,
  Check,
  ClipboardCheck,
  Hourglass,
  MapPin,
  Navigation,
  Plus,
  Scissors,
  Send,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  BookingProgress,
  FromLookCard,
  STATUS_LABELS,
  balanceLine,
  directionsLink,
  isLive,
  serviceLine,
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
import {
  PaymentMethodForm,
  formatDuration,
  paymentLine,
  useMyStylistProfile,
  useUpdateStylistProfile,
  type PaymentMethodDraft,
} from '@/features/stylist';
import { formatMoney, parseMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { confirm, notify } from '@/shared/ui/dialog';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  head: { gap: space.xs },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
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
  // How she's paid: one of her saved ways, or — the first time — typed here and kept.
  const { data: me } = useMyStylistProfile();
  const saveMethod = useUpdateStylistProfile();
  const saved = me?.paymentMethods ?? [];
  const [methodId, setMethodId] = useState<string>();
  const [typed, setTyped] = useState<PaymentMethodDraft>({ label: 'Bank transfer', details: '' });
  const [keepTyped, setKeepTyped] = useState(true);

  // The time she picked from your free slots is the default you'll nearly always keep.
  useEffect(() => {
    const asked = booking?.requestedTimes[0];
    if (asked) setWhen(new Date(asked));
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

  const run = async (
    action: () => Promise<unknown>,
    title: string,
    leave = true,
    after?: () => void
  ) => {
    try {
      await action();
      haptics.success();
      after?.();
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
  // The one she tapped, else the first she saved; nothing saved means typing one.
  const picked = methodId === 'new' ? undefined : (saved.find(m => m.id === methodId) ?? saved[0]);
  const method = picked
    ? paymentLine(picked)
    : typed.label.trim() && typed.details.trim()
      ? paymentLine({ label: typed.label.trim(), details: typed.details.trim() })
      : '';
  const depositArgs = amount > 0 ? { amount, method } : undefined;
  // A deposit she can't pay is no deposit: asking for one needs a way to pay it.
  const missingMethod = amount > 0 && !method;
  const keepIt = () => {
    if (!picked && amount > 0 && keepTyped && method) {
      saveMethod.mutate({
        paymentMethods: [
          ...saved,
          { id: `pay_${Date.now()}`, label: typed.label.trim(), details: typed.details.trim() },
        ],
      });
    }
  };
  // The time she asked for is an answer; any other time is a suggestion she has to agree to.
  const onAskedDay = booking.requestedTimes.some(t => new Date(t).getTime() === when.getTime());
  const started = !!booking.scheduledFor && new Date(booking.scheduledFor) <= new Date();

  const take = () =>
    run(
      () =>
        onAskedDay
          ? accept.mutateAsync({ id, scheduledFor: when.toISOString(), deposit: depositArgs })
          : propose.mutateAsync({ id, scheduledFor: when.toISOString(), deposit: depositArgs }),
      onAskedDay ? 'Couldn’t accept it' : 'Couldn’t send that',
      true,
      keepIt
    );

  const say = async () => {
    const yes = await confirm({
      title: `Turn down ${booking.clientName}?`,
      message: 'They’ll be told, and offered other stylists.',
      confirmLabel: 'Decline',
      destructive: true,
    });
    if (yes) await run(() => decline.mutateAsync({ id }), 'Couldn’t decline it');
  };

  const cancelIt = async () => {
    const yes = await confirm({
      title: `Cancel ${first}’s appointment?`,
      message:
        'Their deposit is always returned when you cancel, and it counts against your record. Moving it instead keeps both of you whole.',
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
            {`${booking.fromPrice ? 'from ' : ''}${formatMoney(booking.price)}`}
            {status !== 'requested' && status !== 'awaiting_deposit' && status !== 'confirmed'
              ? ` · ${STATUS_LABELS[status]}`
              : ''}
          </Text>
          {isLive(booking) && !!balanceLine(booking) && (
            <Text variant="footnote" tone="tertiary" testID="request-balance">
              {balanceLine(booking)}
            </Text>
          )}
        </View>

        <BookingProgress booking={booking} />

        {booking.fromLook && (
          <FromLookCard look={booking.fromLook} title="They booked from this look" />
        )}

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
          {booking.atClient && (
            <ListRow
              title={booking.address ?? `At their place · ${booking.area}`}
              subtitle={
                booking.address
                  ? 'You’re going to them. Tap for directions'
                  : 'You go to them. Their street arrives once you confirm'
              }
              icon={booking.address ? Navigation : MapPin}
              iconTone={booking.address ? 'success' : 'neutral'}
              onPress={
                booking.address
                  ? () =>
                      Linking.openURL(directionsLink(booking.address!, Platform.OS)).catch(() => {})
                  : undefined
              }
              testID="request-where"
            />
          )}
        </Section>

        {!!booking.notes && (
          <Section title="What they said">
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
                She asked for {booking.requestedTimes.map(whenLabel).join(', or ')}
              </Text>
              <DateTimeField title="Day" mode="date" value={when} onChange={setWhen} />
              <DateTimeField title="Start at" mode="time" value={when} onChange={setWhen} />
              {!onAskedDay && (
                <Text variant="caption" tone="accent" style={styles.label}>
                  That’s not the time they picked, so they’ll be asked if it works.
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
              <View style={styles.group}>
                <Text variant="footnote" tone="secondary" style={styles.label}>
                  How they pay you
                </Text>
                {saved.length > 0 && (
                  <View style={styles.chips}>
                    {saved.map(m => (
                      <Chip
                        key={m.id}
                        label={m.label}
                        selected={picked?.id === m.id}
                        onPress={() => setMethodId(m.id)}
                      />
                    ))}
                    <Chip
                      label="Something else"
                      icon={Plus}
                      selected={!picked}
                      onPress={() => setMethodId('new')}
                    />
                  </View>
                )}
                {picked ? (
                  <Text variant="caption" tone="tertiary" style={styles.label}>
                    {picked.details} — sent only to her, once you accept
                  </Text>
                ) : (
                  <>
                    <PaymentMethodForm value={typed} onChange={setTyped} />
                    {saved.length < 5 && (
                      <Section>
                        <ListRow
                          title="Save it for next time"
                          trailing={
                            <Toggle
                              value={keepTyped}
                              onValueChange={setKeepTyped}
                              accessibilityLabel="Save it for next time"
                            />
                          }
                        />
                      </Section>
                    )}
                  </>
                )}
              </View>
            )}

            <View style={styles.footer}>
              <Button
                label={onAskedDay ? 'Accept' : 'Suggest this time'}
                icon={onAskedDay ? Check : Send}
                onPress={take}
                disabled={missingMethod}
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
              message={`Accepted for ${inSentence(whenLabel(booking.scheduledFor ?? ''))}. They’ve been asked for ${formatMoney(booking.deposit?.amount ?? 0)}${booking.expiresAt ? `, and have until ${inSentence(whenLabel(booking.expiresAt))}` : ''}. Marking it received confirms the booking and ${booking.atClient ? 'sends you their address' : 'shares your address'}.`}
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
                    ? 'They said yes to the reminder'
                    : 'They’re asked the day before'
                }
                icon={UserCheck}
                iconTone={booking.attendanceConfirmedAt ? 'success' : 'neutral'}
              />
            </Section>

            {booking.moveRequest?.by === 'client' && (
              <View style={styles.group}>
                <InlineAlert
                  tone="info"
                  message={`${first} asked to move it to ${inSentence(whenLabel(booking.moveRequest.scheduledFor))}. Their deposit and history carry over.`}
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
                tone="info"
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
              subtitle={booking.contested?.timing ? 'They contested this' : undefined}
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
