import { View } from 'react-native';
import { Banknote, Inbox, UserRound } from 'lucide-react-native';
import { recordLabel, useBookings, whenLabel, type Booking } from '@/features/booking';
import { useRouter } from '@/shared/lib/navigation';
import { formatMoney } from '@/shared/lib/format';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

/**
 * Her inbox. New requests first, then the ones waiting on a deposit — the two
 * piles she can actually do something about.
 */
export default function RequestsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useBookings('stylist', [
    'requested',
    'awaiting_deposit',
  ]);

  const bookings = data ?? [];
  const asked = bookings.filter(booking => booking.status === 'requested');
  const waiting = bookings.filter(booking => booking.status === 'awaiting_deposit');

  const row = (booking: Booking) => (
    <ListRow
      key={booking.id}
      title={`${booking.clientName} · ${booking.serviceName}`}
      subtitle={
        booking.status === 'awaiting_deposit'
          ? `${whenLabel(booking.scheduledFor ?? '')} · ${recordLabel(booking.clientRecord) ?? ''}`
          : `${booking.requestedTimes.map(whenLabel).join(' · ')}`
      }
      value={
        booking.status === 'awaiting_deposit' && booking.deposit
          ? formatMoney(booking.deposit.amount)
          : undefined
      }
      icon={booking.status === 'awaiting_deposit' ? Banknote : UserRound}
      iconTone={booking.status === 'awaiting_deposit' ? 'gold' : 'accent'}
      onPress={() => router.push(`/requests/${booking.id}`)}
      testID={`request-${booking.id}`}
    />
  );

  return (
    <Screen
      title="Requests"
      refreshing={isRefetching}
      onRefresh={refetch}
      testID="stylist-requests"
    >
      <View style={styles.body}>
        {isLoading ? (
          <Skeleton height={200} />
        ) : bookings.length ? (
          <>
            {asked.length > 0 && (
              <Section title="New" footer="48 hours to reply, or it expires on its own.">
                {asked.map(row)}
              </Section>
            )}
            {waiting.length > 0 && (
              <Section
                title="Waiting on a deposit"
                footer="Marking it received confirms the booking."
              >
                {waiting.map(row)}
              </Section>
            )}
          </>
        ) : (
          <EmptyState
            icon={Inbox}
            title="No requests yet"
            message="When someone asks for a date, it lands here with their hair profile and their record."
          />
        )}
      </View>
    </Screen>
  );
}
