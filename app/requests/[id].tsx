import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { setHours, startOfHour } from 'date-fns';
import { Banknote, Check, Scissors, UserRound, X } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  dayLabel,
  recordLabel,
  useAcceptRequest,
  useBooking,
  useDeclineRequest,
  useMarkDepositReceived,
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
 * One request, and the three things she can do with it: take it at a time she
 * picks, say no, or — once she's accepted — say the deposit arrived.
 */
export default function RequestScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(id);

  const accept = useAcceptRequest();
  const decline = useDeclineRequest();
  const markPaid = useMarkDepositReceived();

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

  const take = async () => {
    const amount = parseMoney(deposit);
    try {
      await accept.mutateAsync({
        id,
        scheduledFor: when.toISOString(),
        deposit: amount > 0 ? { amount, method: method.trim() } : undefined,
      });
      haptics.success();
      router.back();
    } catch (error) {
      await fail(error, 'Couldn’t accept it');
    }
  };

  const say = async () => {
    const yes = await confirm({
      title: `Turn down ${booking?.clientName ?? 'this request'}?`,
      message: 'She’ll be told, and offered other stylists.',
      confirmLabel: 'Decline',
      destructive: true,
    });
    if (!yes) return;
    try {
      await decline.mutateAsync({ id });
      haptics.success();
      router.back();
    } catch (error) {
      await fail(error, 'Couldn’t decline it');
    }
  };

  const paid = async () => {
    try {
      await markPaid.mutateAsync(id);
      haptics.success();
      router.back();
    } catch (error) {
      await fail(error, 'Couldn’t confirm it');
    }
  };

  if (isLoading || !booking) {
    return (
      <Screen title="Request" back testID="request-screen">
        <Skeleton height={240} />
      </Screen>
    );
  }

  const awaiting = booking.status === 'awaiting_deposit';

  return (
    <Screen title={booking.clientName} back keyboard testID="request-screen">
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="title2" accessibilityRole="header">
            {booking.serviceName}
          </Text>
          <Text variant="subhead" tone="secondary">
            {booking.clientName} ·{' '}
            {`${booking.fromPrice ? 'from ' : ''}${formatMoney(booking.price)}`}
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

        {awaiting ? (
          <>
            <InlineAlert
              tone="info"
              message={`Accepted for ${whenLabel(booking.scheduledFor ?? '')}. She's been asked for ${formatMoney(booking.deposit?.amount ?? 0)}. Marking it received confirms the booking and shares your address.`}
            />
            <View style={styles.footer}>
              <Button
                label="The deposit arrived"
                icon={Banknote}
                onPress={paid}
                loading={markPaid.isPending}
                fullWidth
                testID="request-deposit-received"
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.group}>
              <Text variant="footnote" tone="secondary" style={styles.label}>
                She asked for {booking.requestedTimes.map(dayLabel).join(', then ')}
              </Text>
              <DateTimeField title="Day" mode="date" value={when} onChange={setWhen} />
              <DateTimeField title="Start at" mode="time" value={when} onChange={setWhen} />
            </View>

            <Input
              label="Deposit to confirm"
              value={deposit}
              onChangeText={setDeposit}
              placeholder="20"
              keyboardType="decimal-pad"
              hint="Leave it empty to confirm without one"
            />
            {parseMoney(deposit) > 0 && (
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
                label="Accept"
                icon={Check}
                onPress={take}
                loading={accept.isPending}
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
      </View>
    </Screen>
  );
}
