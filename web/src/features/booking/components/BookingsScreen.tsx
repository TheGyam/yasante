import { CalendarClock, CalendarX } from 'lucide-react';
import { SignedInAs } from '@/features/auth';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { CLIENT_STATUS_LABELS, isLive, whenLabel } from '../format';
import { useMyBookings } from '../hooks';
import type { Booking } from '../types';
import { GetTheApp } from './GetTheApp';
import * as styles from './BookScreen.css';

/** Everything she has asked for or been given, the live ones first. As the app's list. */
export function BookingsScreen() {
  const { data: bookings, isPending, error, refetch } = useMyBookings();

  const row = (booking: Booking) => (
    <ListRow
      key={booking.id}
      to={`/bookings/${booking.id}`}
      icon={CalendarClock}
      iconTone={booking.status === 'confirmed' ? 'success' : 'neutral'}
      title={`${booking.serviceName} · ${booking.stylistName}`}
      subtitle={`${
        booking.scheduledFor
          ? whenLabel(booking.scheduledFor, booking.timeZone)
          : booking.requestedTimes.map(t => whenLabel(t, booking.timeZone)).join(' · ')
      } · ${CLIENT_STATUS_LABELS[booking.status]}`}
    />
  );

  if (isPending) {
    return (
      <Page title="Your bookings">
        <div className={styles.column}>
          <Skeleton style={{ height: 200, borderRadius: 20 }} />
        </div>
      </Page>
    );
  }
  if (error) {
    return (
      <Page title="Your bookings">
        <EmptyState
          as="h1"
          title="Couldn’t load your bookings"
          body={errorMessage(error, 'Check your connection and try again.')}
          action={
            <Button label="Try again" variant="secondary" size="md" onClick={() => refetch()} />
          }
        />
      </Page>
    );
  }

  const live = bookings.filter(isLive);
  const past = bookings.filter(b => !isLive(b));
  return (
    <Page title="Your bookings">
      <div className={styles.column}>
        {bookings.length ? (
          <>
            {live.length > 0 && (
              <Section title="Coming up">
                <Glass radius="lg">{live.map(row)}</Glass>
              </Section>
            )}
            {past.length > 0 && (
              <Section title="Before">
                <Glass radius="lg">{past.map(row)}</Glass>
              </Section>
            )}
          </>
        ) : (
          <EmptyState
            as="h1"
            icon={CalendarX}
            title="No bookings yet"
            body="Find a stylist from a look you like, and ask them for a date."
            action={<Button label="See looks" variant="secondary" size="md" to="/looks" />}
          />
        )}
        <GetTheApp />
        <SignedInAs />
      </div>
    </Page>
  );
}
