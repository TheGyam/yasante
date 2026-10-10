import { CalendarClock, Inbox, Wallet } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { formatPrice } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useBookings } from '../hooks';
import { inSentence, whenLabel } from '../format';
import type { Booking } from '../types';

const OPEN = ['requested', 'awaiting_deposit'] as const;
const PAST = [
  'completed',
  'declined',
  'expired',
  'cancelled_in_time',
  'cancelled_late',
  'cancelled_by_stylist',
  'no_show',
] as const;

function row(booking: Booking, subtitle: string, icon = CalendarClock) {
  return (
    <ListRow
      key={booking.id}
      icon={icon}
      title={`${booking.clientName} · ${booking.serviceName}`}
      subtitle={subtitle}
      value={formatPrice(booking.price, booking.fromPrice)}
      to={`/requests/${booking.id}`}
    />
  );
}

/** What's waiting on her, then what's booked, then what's done. */
export function RequestsScreen() {
  const open = useBookings([...OPEN]);
  const confirmed = useBookings(['confirmed']);
  const past = useBookings([...PAST]);

  if (open.isPending) {
    return (
      <Page title="Requests">
        <Skeleton style={{ height: 200, borderRadius: 20 }} />
      </Page>
    );
  }
  if (open.isError) {
    return (
      <Page title="Requests">
        <EmptyState
          as="h1"
          title="Couldn’t load your requests"
          body={errorMessage(open.error, 'Please try again in a moment.')}
          action={
            <Button
              label="Try again"
              variant="secondary"
              size="md"
              onClick={() => open.refetch()}
            />
          }
        />
      </Page>
    );
  }

  const asked = (open.data ?? []).filter(b => b.status === 'requested');
  const deposits = (open.data ?? []).filter(b => b.status === 'awaiting_deposit');
  const booked = confirmed.data ?? [];
  const done = (past.data ?? []).slice(0, 20);

  return (
    <Page title="Requests">
      <Text variant="title1">Requests</Text>
      {!asked.length && !deposits.length && !booked.length && !done.length ? (
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          body="When a client asks for an appointment, it lands here. Share your page link so they can find you."
        />
      ) : (
        <>
          {asked.length > 0 && (
            <Section
              title="Waiting for your answer"
              footer="A request you don’t answer in 48 hours lapses on its own."
            >
              {asked.map(b =>
                row(
                  b,
                  b.proposal
                    ? `You suggested ${inSentence(whenLabel(b.proposal.scheduledFor, b.timeZone))}`
                    : b.expiresAt
                      ? `Answer by ${inSentence(whenLabel(b.expiresAt))}`
                      : 'New request',
                  Inbox
                )
              )}
            </Section>
          )}
          {deposits.length > 0 && (
            <Section title="Waiting for a deposit">
              {deposits.map(b =>
                row(
                  b,
                  `${whenLabel(b.scheduledFor ?? '', b.timeZone)} · mark it when it arrives`,
                  Wallet
                )
              )}
            </Section>
          )}
          {booked.length > 0 && (
            <Section title="Booked">
              {booked.map(b => row(b, whenLabel(b.scheduledFor ?? '', b.timeZone)))}
            </Section>
          )}
          {done.length > 0 && (
            <Section title="Past">
              {done.map(b =>
                row(b, b.scheduledFor ? whenLabel(b.scheduledFor, b.timeZone) : 'Not booked')
              )}
            </Section>
          )}
        </>
      )}
    </Page>
  );
}
