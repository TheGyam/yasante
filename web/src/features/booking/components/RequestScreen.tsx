import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Banknote, CalendarClock, Clock, MapPin, Scissors, UserRound } from 'lucide-react';
import { errorMessage, isNotFound } from '@/shared/lib/errors';
import {
  currencySymbol,
  DEFAULT_CURRENCY,
  formatMoney,
  formatPrice,
  SEP,
} from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, Select } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import {
  useAccept,
  useBooking,
  useCancel,
  useClose,
  useDecline,
  useDepositReceived,
  usePropose,
} from '../hooks';
import {
  STATUS_LABELS,
  fromSalonInput,
  inSentence,
  recordLabel,
  suggestedDeposit,
  toSalonInput,
  whenLabel,
} from '../format';
import type { Booking } from '../types';
import * as styles from './RequestScreen.css';

export interface PaymentOption {
  label: string;
  details: string;
}

export interface RequestScreenProps {
  id: string;
  /** Her saved ways to be paid, to name for a deposit. */
  paymentMethods: PaymentOption[];
}

/** One request or appointment, and whatever she can do with it now. As the app's. */
export function RequestScreen({ id, paymentMethods }: RequestScreenProps) {
  const { data: booking, isPending, error, refetch } = useBooking(id);

  if (isPending) {
    return (
      <Page title="Request">
        <Skeleton style={{ height: 280, borderRadius: 20 }} />
      </Page>
    );
  }
  if (!booking) {
    return (
      <Page title="Request">
        <EmptyState
          as="h1"
          title={isNotFound(error) ? 'This request isn’t here' : 'Couldn’t load this request'}
          body={
            isNotFound(error) ? undefined : errorMessage(error, 'Please try again in a moment.')
          }
          action={
            isNotFound(error) ? (
              <Button label="Back to requests" variant="secondary" size="md" to="/requests" />
            ) : (
              <Button label="Try again" variant="secondary" size="md" onClick={() => refetch()} />
            )
          }
        />
      </Page>
    );
  }
  return <Request booking={booking} paymentMethods={paymentMethods} />;
}

function Request({
  booking,
  paymentMethods,
}: {
  booking: Booking;
  paymentMethods: PaymentOption[];
}) {
  const first = booking.clientName.split(' ')[0];
  const status = booking.status;

  return (
    <Page title={booking.clientName}>
      <div className={styles.column}>
        <div className={styles.head}>
          <Link to="/requests">
            <Text variant="footnote" tone="accent">
              ← Requests
            </Text>
          </Link>
          <Text variant="title1">{booking.clientName}</Text>
          <Text variant="subhead" tone="secondary">
            {STATUS_LABELS[status]}
            {booking.scheduledFor && status !== 'requested'
              ? `${SEP}${whenLabel(booking.scheduledFor, booking.timeZone)}`
              : ''}
          </Text>
        </div>

        {booking.fromLook && (
          <Glass padded radius="lg" className={styles.lookRow}>
            <RemoteImage
              src={booking.fromLook.thumbUri ?? booking.fromLook.photoUri}
              alt="The look they booked from"
              aspect={booking.fromLook.photoAspect ?? 4 / 5}
              className={styles.look}
            />
            <Text variant="subhead" tone="secondary">
              They booked from this look.
            </Text>
          </Glass>
        )}

        <Section title="Who’s asking">
          <ListRow
            icon={UserRound}
            iconTone="neutral"
            title={recordLabel(booking.clientRecord) ?? 'First booking on Yasante'}
            subtitle={booking.clientHair}
          />
          <ListRow
            icon={Scissors}
            title={booking.serviceName}
            subtitle={
              [
                booking.optionLabels?.join(SEP),
                booking.bringingOwnHair ? 'Bringing their own hair' : undefined,
              ]
                .filter(Boolean)
                .join(SEP) || undefined
            }
            value={formatPrice(
              booking.price,
              booking.currency ?? DEFAULT_CURRENCY,
              booking.fromPrice
            )}
          />
          {booking.atClient && (
            <ListRow
              icon={MapPin}
              iconTone={booking.address ? 'success' : 'neutral'}
              title={booking.address ?? `At their place${SEP}${booking.area}`}
              subtitle={
                booking.address
                  ? 'You’re going to them'
                  : 'You go to them. Their street arrives once you confirm'
              }
            />
          )}
        </Section>

        {booking.notes && (
          <Section title="What they said">
            <ListRow title={booking.notes} />
          </Section>
        )}

        {status === 'requested' && booking.proposal && (
          <InlineAlert
            tone="info"
            message={`You suggested ${inSentence(whenLabel(booking.proposal.scheduledFor, booking.timeZone))}. Waiting for ${first} to say yes.`}
          />
        )}
        {status === 'requested' && !booking.proposal && (
          <Answer booking={booking} paymentMethods={paymentMethods} />
        )}
        {status === 'awaiting_deposit' && <AwaitingDeposit booking={booking} />}
        {status === 'confirmed' && <Confirmed booking={booking} />}
        {status === 'completed' && (
          <Section title="How it went">
            {booking.actualPrice !== undefined && (
              <ListRow
                icon={Banknote}
                title="Paid"
                value={formatMoney(booking.actualPrice, booking.currency ?? DEFAULT_CURRENCY)}
              />
            )}
          </Section>
        )}
      </div>
    </Page>
  );
}

function Answer({
  booking,
  paymentMethods,
}: {
  booking: Booking;
  paymentMethods: PaymentOption[];
}) {
  const navigate = useNavigate();
  const accept = useAccept();
  const propose = usePropose();
  const decline = useDecline();
  const asked = booking.requestedTimes;
  const [picked, setPicked] = useState<string | 'other'>(asked[0] ?? 'other');
  const [other, setOther] = useState(() =>
    toSalonInput(asked[0] ?? new Date(Date.now() + 86_400_000), booking.timeZone)
  );
  const [deposit, setDeposit] = useState(() => {
    const amount = suggestedDeposit(booking);
    return amount ? String(amount) : '';
  });
  const [method, setMethod] = useState(0);

  const amount = Number(deposit.replace(/[^\d.]/g, '')) || 0;
  const payment = paymentMethods[method];
  const missingMethod = amount > 0 && !payment;
  const depositArgs =
    amount > 0 && payment ? { amount, method: `${payment.label} · ${payment.details}` } : undefined;
  const onAsked = picked !== 'other';
  const failure = accept.error ?? propose.error ?? decline.error;
  const busy = accept.isPending || propose.isPending || decline.isPending;

  const send = () => {
    const at = onAsked ? picked : fromSalonInput(other, booking.timeZone);
    const done = { onSuccess: () => navigate('/requests') };
    if (onAsked) accept.mutate({ id: booking.id, at, deposit: depositArgs }, done);
    else propose.mutate({ id: booking.id, at, deposit: depositArgs }, done);
  };

  return (
    <Glass padded radius="xl" className={styles.card}>
      <Text variant="title3" as="h2">
        Your answer
      </Text>
      {booking.expiresAt && (
        <Text variant="footnote" tone="secondary">
          Answer by {inSentence(whenLabel(booking.expiresAt))}. After that it lapses, and counts
          against your response rate.
        </Text>
      )}
      <div className={styles.chips} role="radiogroup" aria-label="When">
        {asked.map(time => (
          <Chip
            key={time}
            label={whenLabel(time, booking.timeZone)}
            selected={picked === time}
            onClick={() => setPicked(time)}
          />
        ))}
        <Chip
          label="Another time"
          selected={picked === 'other'}
          onClick={() => setPicked('other')}
        />
      </div>
      {picked === 'other' && (
        <Input
          label="Suggest a time (London time)"
          type="datetime-local"
          value={other}
          onChange={event => setOther(event.target.value)}
          hint={`${booking.clientName.split(' ')[0]} will be asked if it works for them.`}
        />
      )}
      <Input
        label={`Deposit to confirm (${currencySymbol(booking.currency ?? DEFAULT_CURRENCY)})`}
        inputMode="decimal"
        value={deposit}
        placeholder="0"
        onChange={event => setDeposit(event.target.value)}
        hint="Leave it at 0 for no deposit. They pay you directly."
      />
      {amount > 0 &&
        (paymentMethods.length ? (
          <Select
            label="Paid to"
            value={method}
            onChange={event => setMethod(Number(event.target.value))}
            hint="Sent only to them, once you accept."
          >
            {paymentMethods.map((m, i) => (
              <option key={`${m.label}${i}`} value={i}>
                {m.label}
                {SEP}
                {m.details}
              </option>
            ))}
          </Select>
        ) : (
          <InlineAlert
            tone="info"
            message="Add how you’re paid (under Account → Getting paid) to ask for a deposit."
          />
        ))}
      {failure && <InlineAlert message={errorMessage(failure, 'Couldn’t send that. Try again.')} />}
      <div className={styles.actions}>
        <Button
          label={onAsked ? 'Accept' : 'Suggest this time'}
          onClick={send}
          disabled={missingMethod || busy}
          loading={accept.isPending || propose.isPending}
          fullWidth
        />
        <Button
          label="Decline"
          variant="ghost"
          onClick={() => {
            if (window.confirm(`Decline ${booking.clientName.split(' ')[0]}’s request?`)) {
              decline.mutate(booking.id, { onSuccess: () => navigate('/requests') });
            }
          }}
          loading={decline.isPending}
          fullWidth
        />
      </div>
    </Glass>
  );
}

function AwaitingDeposit({ booking }: { booking: Booking }) {
  const received = useDepositReceived();
  return (
    <Glass padded radius="xl" className={styles.card}>
      <Text variant="body">
        Accepted for {inSentence(whenLabel(booking.scheduledFor ?? '', booking.timeZone))}. They’ve
        been asked for{' '}
        {formatMoney(booking.deposit?.amount ?? 0, booking.currency ?? DEFAULT_CURRENCY)}
        {booking.expiresAt ? `, and have until ${inSentence(whenLabel(booking.expiresAt))}` : ''}.
        Marking it received confirms the booking and{' '}
        {booking.atClient ? 'sends you their address' : 'shares your address'}.
      </Text>
      {received.isError && (
        <InlineAlert message={errorMessage(received.error, 'Couldn’t mark it.')} />
      )}
      <Button
        label="The deposit arrived"
        onClick={() => received.mutate(booking.id)}
        loading={received.isPending}
        fullWidth
      />
    </Glass>
  );
}

function Confirmed({ booking }: { booking: Booking }) {
  const first = booking.clientName.split(' ')[0];
  const started = !!booking.scheduledFor && new Date(booking.scheduledFor) <= new Date();
  const cancel = useCancel();
  return (
    <>
      <Section>
        <ListRow
          icon={CalendarClock}
          title={whenLabel(booking.scheduledFor ?? '', booking.timeZone)}
          subtitle={booking.moves ? 'Moved once' : undefined}
        />
        <ListRow
          icon={Clock}
          iconTone={booking.attendanceConfirmedAt ? 'success' : 'neutral'}
          title={booking.attendanceConfirmedAt ? `${first} is coming` : 'Not confirmed yet'}
          subtitle={booking.attendanceConfirmedAt ? undefined : 'They’re asked the day before'}
        />
      </Section>
      {started ? (
        <CloseOut booking={booking} />
      ) : (
        <Button
          label="Cancel the appointment"
          variant="ghost"
          loading={cancel.isPending}
          onClick={() => {
            if (
              window.confirm(
                'Their deposit is always returned when you cancel, and it counts against your record. Cancel it?'
              )
            ) {
              cancel.mutate(booking.id);
            }
          }}
        />
      )}
      {cancel.isError && (
        <InlineAlert message={errorMessage(cancel.error, 'Couldn’t cancel it.')} />
      )}
    </>
  );
}

const TIMINGS = [
  { value: 'early', label: 'Finished early' },
  { value: 'on_time', label: 'On time' },
  { value: 'over', label: 'Ran over' },
] as const;

const BUCKETS = [
  { value: 'under_30', label: 'Under 30 minutes' },
  { value: '30_60', label: '30 minutes to an hour' },
  { value: '1_2h', label: '1 to 2 hours' },
  { value: '2h_plus', label: 'More than 2 hours' },
] as const;

/** When the client has left: did they come, what was paid, how the time went. Never minutes. */
function CloseOut({ booking }: { booking: Booking }) {
  const close = useClose();
  const [came, setCame] = useState(true);
  const [paid, setPaid] = useState(String(booking.price));
  const [timing, setTiming] = useState<(typeof TIMINGS)[number]['value']>('on_time');
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]['value']>('under_30');

  const submit = () =>
    close.mutate({
      id: booking.id,
      closeOut: came
        ? {
            outcome: 'attended',
            actualPrice: Number(paid.replace(/[^\d.]/g, '')) || booking.price,
            timing: timing === 'on_time' ? { outcome: timing } : { outcome: timing, bucket },
          }
        : { outcome: 'no_show' },
    });

  return (
    <Glass padded radius="xl" className={styles.card}>
      <Text variant="title3" as="h2">
        Close it out
      </Text>
      <Text variant="footnote" tone="secondary">
        It’s what keeps your numbers honest.
      </Text>
      <div className={styles.chips}>
        <Chip label="They came" selected={came} onClick={() => setCame(true)} />
        <Chip label="They didn’t turn up" selected={!came} onClick={() => setCame(false)} />
      </div>
      {came && (
        <>
          <Input
            label={`What they paid (${currencySymbol(booking.currency ?? DEFAULT_CURRENCY)})`}
            inputMode="decimal"
            value={paid}
            onChange={e => setPaid(e.target.value)}
          />
          <div className={styles.chips}>
            {TIMINGS.map(t => (
              <Chip
                key={t.value}
                label={t.label}
                selected={timing === t.value}
                onClick={() => setTiming(t.value)}
              />
            ))}
          </div>
          {timing !== 'on_time' && (
            <Select
              label="By about"
              value={bucket}
              onChange={e => setBucket(e.target.value as typeof bucket)}
            >
              {BUCKETS.map(b => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
          )}
        </>
      )}
      {close.isError && (
        <InlineAlert message={errorMessage(close.error, 'Couldn’t close it out.')} />
      )}
      <Button label="Close it out" onClick={submit} loading={close.isPending} fullWidth />
    </Glass>
  );
}
