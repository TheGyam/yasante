import { View } from 'react-native';
import { CalendarClock, CalendarX } from 'lucide-react-native';
import {
  STATUS_LABELS,
  dayLabel,
  isLive,
  useBookings,
  whenLabel,
  type Booking,
} from '@/features/booking';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

/** Everything she has asked for or been given, the live ones first. */
export default function BookingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data: bookings = [], isLoading, isRefetching, refetch } = useBookings('client');

  const live = bookings.filter(isLive);
  const past = bookings.filter(booking => !isLive(booking));

  const row = (booking: Booking) => (
    <ListRow
      key={booking.id}
      title={`${booking.serviceName} · ${booking.stylistName}`}
      subtitle={
        booking.scheduledFor
          ? whenLabel(booking.scheduledFor)
          : booking.requestedTimes.map(dayLabel).join(' · ')
      }
      value={STATUS_LABELS[booking.status]}
      icon={CalendarClock}
      iconTone={booking.status === 'confirmed' ? 'success' : 'neutral'}
      onPress={() => router.push(`/bookings/${booking.id}`)}
      testID={`booking-${booking.id}`}
    />
  );

  return (
    <Screen
      title="Your bookings"
      back
      refreshing={isRefetching}
      onRefresh={refetch}
      testID="bookings-screen"
    >
      <View style={styles.body}>
        {isLoading ? (
          <Skeleton height={200} />
        ) : bookings.length ? (
          <>
            {live.length > 0 && <Section title="Coming up">{live.map(row)}</Section>}
            {past.length > 0 && <Section title="Before">{past.map(row)}</Section>}
          </>
        ) : (
          <EmptyState
            icon={CalendarX}
            title="No bookings yet"
            message="Find a stylist from a look you like, and ask her for a date."
          />
        )}
      </View>
    </Screen>
  );
}
