import { useState } from 'react';
import { View } from 'react-native';
import { format } from 'date-fns';
import {
  Banknote,
  CalendarX,
  CircleCheck,
  CircleSlash,
  History,
  Inbox,
  UserRound,
  UserX,
  type LucideIcon,
} from 'lucide-react-native';
import {
  STYLIST_STATUS_LABELS,
  isLive,
  recordLabel,
  salonTime,
  useBookings,
  whenLabel,
  type Booking,
  type BookingStatus,
} from '@/features/booking';
import { useRouter } from '@/shared/lib/navigation';
import { formatMoney } from '@/shared/lib/format';
import { makeStyles, space } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow, type ListRowTone } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Skeleton } from '@/shared/ui/Skeleton';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));

const VIEWS = [
  { value: 'requests', label: 'Requests' },
  { value: 'history', label: 'History' },
] as const;

/** How each finished booking reads at a glance. */
const OUTCOME: Partial<Record<BookingStatus, { icon: LucideIcon; tone: ListRowTone }>> = {
  completed: { icon: CircleCheck, tone: 'success' },
  no_show: { icon: UserX, tone: 'danger' },
  cancelled_late: { icon: CalendarX, tone: 'gold' },
  cancelled_in_time: { icon: CalendarX, tone: 'neutral' },
  cancelled_by_stylist: { icon: CalendarX, tone: 'neutral' },
  declined: { icon: CircleSlash, tone: 'neutral' },
  expired: { icon: CircleSlash, tone: 'neutral' },
};

const FILTERS: { value: string; label: string; statuses?: BookingStatus[] }[] = [
  { value: 'all', label: 'All' },
  { value: 'done', label: 'Done', statuses: ['completed'] },
  { value: 'no_show', label: 'No-shows', statuses: ['no_show'] },
  {
    value: 'cancelled',
    label: 'Cancelled',
    statuses: ['cancelled_in_time', 'cancelled_late', 'cancelled_by_stylist'],
  },
  { value: 'not_taken', label: 'Not taken', statuses: ['declined', 'expired'] },
];

/** When it was, or was going to be. */
const when = (booking: Booking) =>
  booking.scheduledFor ?? booking.requestedTimes[0] ?? booking.updatedAt;

/**
 * Her bookings. Requests: the two piles she can act on now. History: everything that
 * has ended, however it ended, newest first and by month.
 */
export default function BookingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const [view, setView] = useState<(typeof VIEWS)[number]['value']>('requests');
  const [filter, setFilter] = useState('all');
  // ponytail: one unpaged list; page it on the server when a stylist has thousands.
  const { data, isLoading, isRefetching, refetch } = useBookings('stylist');

  const bookings = data ?? [];
  const asked = bookings.filter(booking => booking.status === 'requested');
  const waiting = bookings.filter(booking => booking.status === 'awaiting_deposit');
  const ended = bookings
    .filter(booking => !isLive(booking))
    .sort((a, b) => when(b).localeCompare(when(a)));

  const request = (booking: Booking) => (
    <ListRow
      key={booking.id}
      title={`${booking.clientName} · ${booking.serviceName}`}
      subtitle={
        booking.status === 'awaiting_deposit'
          ? `${whenLabel(booking.scheduledFor ?? '', booking.timeZone)} · ${recordLabel(booking.clientRecord) ?? ''}`
          : `${booking.requestedTimes.map(t => whenLabel(t, booking.timeZone)).join(' · ')}`
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

  const past = (booking: Booking) => (
    <ListRow
      key={booking.id}
      title={`${booking.clientName} · ${booking.serviceName}`}
      subtitle={`${whenLabel(when(booking), booking.timeZone)} · ${STYLIST_STATUS_LABELS[booking.status]}`}
      value={
        booking.status === 'completed'
          ? formatMoney(booking.actualPrice ?? booking.price)
          : undefined
      }
      icon={OUTCOME[booking.status]?.icon}
      iconTone={OUTCOME[booking.status]?.tone}
      onPress={() => router.push(`/requests/${booking.id}`)}
      testID={`past-${booking.id}`}
    />
  );

  const count = (f: (typeof FILTERS)[number]) =>
    f.statuses ? ended.filter(b => f.statuses!.includes(b.status)).length : ended.length;
  const chosen = FILTERS.find(f => f.value === filter)!;
  const shown = chosen.statuses ? ended.filter(b => chosen.statuses!.includes(b.status)) : ended;
  // Already newest first, so months come out in order.
  const months = new Map<string, Booking[]>();
  for (const booking of shown) {
    const month = format(salonTime(when(booking), booking.timeZone), 'MMMM yyyy');
    months.set(month, [...(months.get(month) ?? []), booking]);
  }

  return (
    <Screen
      title="Bookings"
      refreshing={isRefetching}
      onRefresh={refetch}
      testID="stylist-requests"
    >
      <View style={styles.body}>
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
        {isLoading ? (
          <Skeleton height={200} />
        ) : view === 'requests' ? (
          asked.length || waiting.length ? (
            <>
              {asked.length > 0 && (
                <Section title="New" footer="48 hours to reply, or it expires on its own.">
                  {asked.map(request)}
                </Section>
              )}
              {waiting.length > 0 && (
                <Section
                  title="Waiting on a deposit"
                  footer="Marking it received confirms the booking."
                >
                  {waiting.map(request)}
                </Section>
              )}
            </>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No requests yet"
              message="When someone asks for a date, it lands here with their hair profile and their record."
            />
          )
        ) : ended.length ? (
          <>
            <View style={styles.chips}>
              {FILTERS.map(f => (
                <Chip
                  key={f.value}
                  label={`${f.label} ${count(f)}`}
                  selected={filter === f.value}
                  onPress={() => setFilter(f.value)}
                />
              ))}
            </View>
            {shown.length ? (
              [...months].map(([month, items]) => (
                <Section key={month} title={month}>
                  {items.map(past)}
                </Section>
              ))
            ) : (
              <EmptyState icon={History} title={`No ${chosen.label.toLowerCase()} yet`} />
            )}
          </>
        ) : (
          <EmptyState
            icon={History}
            title="Nothing here yet"
            message="Every booking that ends, done, cancelled or missed, is kept here."
          />
        )}
      </View>
    </Screen>
  );
}
