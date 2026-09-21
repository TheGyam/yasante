import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  MapPin,
  Scissors,
  TriangleAlert,
} from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  STATUS_LABELS,
  cancellingIsLate,
  dayLabel,
  isLive,
  useBooking,
  useCancelBooking,
  whenLabel,
} from '@/features/booking';
import { formatDuration } from '@/features/stylist';
import { formatMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  head: { gap: space.xs },
  footer: { paddingTop: space.lg },
}));

/** One booking, from the client's side: where it is, and what she does next. */
export default function BookingScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(id);
  const cancel = useCancelBooking();

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

  if (isLoading || !booking) {
    return (
      <Screen title="Booking" back testID="booking-screen">
        <Skeleton height={240} />
      </Screen>
    );
  }

  const when = booking.scheduledFor
    ? whenLabel(booking.scheduledFor)
    : booking.requestedTimes.map(dayLabel).join(' · ');

  return (
    <Screen title={booking.stylistName} back testID="booking-screen">
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="title2" accessibilityRole="header">
            {booking.serviceName}
          </Text>
          <Text variant="subhead" tone="secondary">
            {booking.stylistName} · {STATUS_LABELS[booking.status]}
          </Text>
        </View>

        {booking.status === 'awaiting_deposit' && !!booking.deposit && (
          <InlineAlert
            tone="info"
            message={`Send ${formatMoney(booking.deposit.amount)} to ${booking.stylistName} directly, ${booking.deposit.method || 'using the details she gave you'}. Yasante never handles this payment. She marks it received, and that confirms your booking.`}
          />
        )}

        {booking.status === 'requested' && (
          <InlineAlert message="With her now. She has 48 hours to accept, suggest another time, or say no." />
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

        {isLive(booking) && (
          <View style={styles.footer}>
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
          <Button
            label="Post this as a look"
            onPress={() => router.push('/looks/new')}
            variant="secondary"
            fullWidth
          />
        )}
      </View>
    </Screen>
  );
}
