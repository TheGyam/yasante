import { format } from 'date-fns';
import { View } from 'react-native';
import { BellRing, CalendarClock, CalendarX, X, CalendarCheck } from 'lucide-react-native';
import {
  STATUS_LABELS,
  dayLabel,
  inSentence,
  isLive,
  useBookings,
  useSlotInterests,
  useUnwatchSlots,
  whenLabel,
  type Booking,
  type SlotInterest,
} from '@/features/booking';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadError } from '@/shared/ui/LoadError';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SEP } from '@/shared/lib/format';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

/** Everything she has asked for or been given, the live ones first. */
export default function BookingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const {
    data: bookings = [],
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useBookings('client');

  const { data: waiting = [] } = useSlotInterests();
  const unwatch = useUnwatchSlots();
  const live = bookings.filter(isLive);
  // Newest first. Includes requests for days still to come that were declined or went
  // unanswered, so it's "earlier requests", not "past".
  const when = (b: Booking) => b.scheduledFor ?? b.requestedTimes[0] ?? '';
  const past = bookings
    .filter(booking => !isLive(booking))
    .sort((a, b) => when(b).localeCompare(when(a)));

  const row = (booking: Booking) => (
    <ListRow
      key={booking.id}
      title={`${booking.serviceName}${SEP}${booking.stylistName}`}
      subtitle={
        booking.scheduledFor
          ? whenLabel(booking.scheduledFor, booking.timeZone)
          : booking.requestedTimes.map(t => whenLabel(t, booking.timeZone)).join(SEP)
      }
      value={STATUS_LABELS[booking.status]}
      icon={CalendarClock}
      iconTone={booking.status === 'confirmed' ? 'success' : 'neutral'}
      onPress={() => router.push(`/bookings/${booking.id}`)}
      testID={`booking-${booking.id}`}
    />
  );

  // An opened slot is the one worth acting on now, so it reads as an invitation.
  const slot = (interest: SlotInterest) =>
    interest.openedOn ? (
      <ListRow
        key={interest.id}
        title={
          interest.opens
            ? `${interest.stylistName} is taking bookings for ${format(new Date(`${interest.from}T12:00:00`), 'MMMM')}`
            : `A slot opened with ${interest.stylistName}`
        }
        subtitle={`${dayLabel(interest.openedOn)} — ask before someone else does`}
        icon={CalendarCheck}
        iconTone="success"
        onPress={() => router.push(`/book/${interest.stylistHandle}?date=${interest.openedOn}`)}
        testID={`slot-open-${interest.id}`}
      />
    ) : (
      <ListRow
        key={interest.id}
        title={interest.stylistName}
        subtitle={
          interest.opens
            ? `When ${format(new Date(`${interest.from}T12:00:00`), 'MMMM')} opens for booking`
            : `Any day ${inSentence(dayLabel(interest.from))} – ${inSentence(dayLabel(interest.to))}`
        }
        icon={BellRing}
        iconTone="neutral"
        trailing={
          <IconButton
            icon={X}
            variant="plain"
            size={32}
            accessibilityLabel={`Stop waiting for ${interest.stylistName}`}
            onPress={() => unwatch.mutate(interest.id)}
          />
        }
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
        ) : isError && !bookings.length ? (
          <LoadError what="your bookings" error={error} onRetry={refetch} retrying={isRefetching} />
        ) : bookings.length || waiting.length ? (
          <>
            {live.length > 0 && <Section title="Coming up">{live.map(row)}</Section>}
            {waiting.length > 0 && (
              <Section
                title="Waiting for a slot"
                footer="You're told first when one of these stylists has a cancellation on your days."
              >
                {waiting.map(slot)}
              </Section>
            )}
            {past.length > 0 && <Section title="Earlier requests">{past.map(row)}</Section>}
          </>
        ) : (
          <EmptyState
            icon={CalendarX}
            title="No bookings yet"
            message="Find a stylist from a look you like, and ask them for a date."
          />
        )}
      </View>
    </Screen>
  );
}
