import { useState, type ReactNode } from 'react';
import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  CalendarPlus,
  Hourglass,
  MapPin,
  MessageSquareHeart,
  Navigation,
  Repeat,
  Scissors,
  Star,
  UserCheck,
} from 'lucide-react';
import { formatDuration, useStylistPage } from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { TextArea } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { CLIENT_STATUS_LABELS, cancellingIsLate, inSentence, isLive, whenLabel } from '../format';
import {
  useAnswerMove,
  useAnswerProposal,
  useBooking,
  useCancel,
  useConfirmAttendance,
  useRefreshFreeSlots,
  useRequestMove,
  useReview,
  useStartedOnTime,
} from '../hooks';
import type { Booking } from '../types';
import { GetTheApp } from './GetTheApp';
import { SlotPicker } from './SlotPicker';
import * as styles from './BookingScreen.css';

const serviceLine = (b: Booking) => [b.serviceName, ...(b.optionLabels ?? [])].join(' · ');

/** "From £80 left to pay on the day" once there's a deposit. */
function balanceLine(b: Booking) {
  const left = b.deposit ? b.price - b.deposit.amount : 0;
  if (left <= 0) return undefined;
  const paid = b.deposit!.status === 'received';
  return `${b.fromPrice ? 'From ' : ''}${formatMoney(left)} left to pay on the day${paid ? '' : ', after the deposit'}`;
}

/** Within two days of a confirmed appointment she hasn't said she's coming to. */
function needsAttendance(b: Booking, now = Date.now()) {
  if (b.status !== 'confirmed' || !b.scheduledFor || b.attendanceConfirmedAt) return false;
  const hours = (new Date(b.scheduledFor).getTime() - now) / 3_600_000;
  return hours >= 0 && hours <= 48;
}

/** A question the booking is waiting on her to answer, with its answers. */
function Ask({
  title,
  message,
  children,
}: {
  title: string;
  message?: string;
  children: ReactNode;
}) {
  return (
    <Glass radius="lg" padded className={styles.ask}>
      <div className={styles.askText}>
        <Text variant="bodyStrong">{title}</Text>
        {message && (
          <Text variant="footnote" tone="secondary">
            {message}
          </Text>
        )}
      </div>
      <div className={styles.answers}>{children}</div>
    </Glass>
  );
}

/**
 * One booking, from the client's side: where it is, and what she does next. As the
 * app's (app/bookings/[id].tsx): answer a suggested time, say she's coming, move it,
 * cancel it, and review it after.
 */
export function BookingScreen({ id }: { id: string }) {
  const { data: booking, error, refetch } = useBooking(id);
  const cancel = useCancel();
  const proposal = useAnswerProposal();
  const attending = useConfirmAttendance();
  const answerMove = useAnswerMove();
  const askMove = useRequestMove();
  const onTime = useStartedOnTime();
  const [cancelling, setCancelling] = useState(false);
  // Moving it: '' while she picks, then the new time (ISO) from the stylist's free ones.
  const [moving, setMoving] = useState<string>();
  const refreshSlots = useRefreshFreeSlots();
  const { data: page } = useStylistPage(moving === undefined ? '' : (booking?.stylistHandle ?? ''));
  // The last thing that failed, said in words where it happened.
  const [problem, setProblem] = useState<string>();
  const act = (run: () => Promise<unknown>) => {
    setProblem(undefined);
    run().catch(e => setProblem(errorMessage(e, 'Check your connection and try again.')));
  };

  if (!booking) {
    return (
      <Page title="Booking">
        {error ? (
          <EmptyState
            as="h1"
            title="Couldn’t open this booking"
            body={errorMessage(error, 'Check your connection and try again.')}
            action={
              <Button label="Try again" variant="secondary" size="md" onClick={() => refetch()} />
            }
          />
        ) : (
          <div className={styles.column}>
            <Skeleton style={{ height: 280, borderRadius: 20 }} />
          </div>
        )}
      </Page>
    );
  }

  const zone = booking.timeZone;
  const when = booking.scheduledFor
    ? whenLabel(booking.scheduledFor, zone)
    : booking.requestedTimes.map(t => whenLabel(t, zone)).join(' · ');
  const late = cancellingIsLate(booking);
  // Not answered yet: she withdraws a request rather than cancelling a booking.
  const asking = booking.status === 'requested';
  const balance = balanceLine(booking);

  return (
    <Page title={booking.stylistName}>
      <div className={styles.column}>
        <div className={styles.head}>
          <Link to="/bookings">
            <Text variant="footnote" tone="accent">
              Your bookings
            </Text>
          </Link>
          <Text variant="title1" as="h1">
            {serviceLine(booking)}
          </Text>
          <Text variant="subhead" tone="secondary">
            With {booking.stylistName} · {CLIENT_STATUS_LABELS[booking.status]}
          </Text>
        </div>

        {problem && <InlineAlert message={problem} />}

        {booking.status === 'awaiting_deposit' && booking.deposit && (
          <InlineAlert
            tone="info"
            message={`Send ${formatMoney(booking.deposit.amount)} to ${booking.stylistName} directly, ${booking.deposit.method || 'using the details they gave you'}${booking.expiresAt ? `, by ${inSentence(whenLabel(booking.expiresAt))}` : ''}. Yasante never handles this payment. They mark it received, and that confirms your booking.`}
          />
        )}

        {booking.status === 'requested' && booking.proposal && (
          <Ask
            title={`${booking.stylistName} suggested ${inSentence(whenLabel(booking.proposal.scheduledFor, zone))}`}
            message={
              booking.proposal.deposit
                ? `None of your days worked. Say yes and they’ll ask for a ${formatMoney(booking.proposal.deposit.amount)} deposit.`
                : 'None of your days worked. Say yes and it’s confirmed.'
            }
          >
            <Button
              label="That works"
              size="sm"
              loading={proposal.isPending}
              onClick={() => act(() => proposal.mutateAsync({ id, accept: true }))}
            />
            <Button
              label="It doesn’t"
              size="sm"
              variant="secondary"
              onClick={() => act(() => proposal.mutateAsync({ id, accept: false }))}
            />
          </Ask>
        )}

        {booking.status === 'requested' && !booking.proposal && (
          <InlineAlert
            tone="info"
            message={`With them now. They have until ${booking.expiresAt ? whenLabel(booking.expiresAt) : 'two days from now'} to accept, suggest another time, or say no. We’ll email you when they do.`}
          />
        )}

        {needsAttendance(booking) && (
          <Ask
            title="Still coming?"
            message={`${booking.stylistName} is keeping the time for you. A quick yes lets them plan.`}
          >
            <Button
              label="Yes, I’m coming"
              size="sm"
              loading={attending.isPending}
              onClick={() => act(() => attending.mutateAsync(id))}
            />
            <Button
              label="I can’t make it"
              size="sm"
              variant="secondary"
              onClick={() => setCancelling(true)}
            />
          </Ask>
        )}

        {booking.moveRequest?.by === 'stylist' && (
          <Ask
            title={`${booking.stylistName} asked to move it to ${inSentence(whenLabel(booking.moveRequest.scheduledFor, zone))}`}
            message="Your deposit and history carry over."
          >
            <Button
              label="Move it"
              size="sm"
              loading={answerMove.isPending}
              onClick={() => act(() => answerMove.mutateAsync({ id, accept: true }))}
            />
            <Button
              label="Keep my time"
              size="sm"
              variant="secondary"
              onClick={() => act(() => answerMove.mutateAsync({ id, accept: false }))}
            />
          </Ask>
        )}
        {booking.moveRequest?.by === 'client' && (
          <InlineAlert
            tone="info"
            message={`You asked to move it to ${inSentence(whenLabel(booking.moveRequest.scheduledFor, zone))}. Until they agree, it stays where it is.`}
          />
        )}

        {booking.status === 'completed' && booking.startedOnTime == null && (
          <Ask title="Did it start on time?" message="One tap. It keeps everyone’s numbers fair.">
            <Button
              label="Yes"
              size="sm"
              variant="secondary"
              onClick={() => act(() => onTime.mutateAsync({ id, onTime: true }))}
            />
            <Button
              label="No"
              size="sm"
              variant="secondary"
              onClick={() => act(() => onTime.mutateAsync({ id, onTime: false }))}
            />
          </Ask>
        )}

        <Glass radius="lg">
          <ListRow
            icon={CalendarClock}
            title={when}
            subtitle={booking.scheduledFor ? undefined : 'The time you asked for'}
          />
          <ListRow
            icon={Scissors}
            title={booking.serviceName}
            subtitle={booking.durationMinutes ? formatDuration(booking.durationMinutes) : undefined}
            value={`${booking.fromPrice ? 'from ' : ''}${formatMoney(booking.price)}`}
          />
          <ListRow
            icon={MapPin}
            iconTone={booking.address ? 'success' : 'neutral'}
            title={booking.address ?? booking.area}
            subtitle={
              booking.atClient
                ? `${booking.stylistName} is coming to you`
                : booking.address
                  ? 'The full address'
                  : 'The address arrives once they confirm'
            }
          />
          {booking.status === 'confirmed' && booking.attendanceConfirmedAt && (
            <ListRow icon={UserCheck} iconTone="success" title="You said you’re coming" />
          )}
          {(booking.status === 'requested' || booking.status === 'awaiting_deposit') &&
            booking.expiresAt && (
              <ListRow
                icon={Hourglass}
                iconTone="neutral"
                title={`Lapses ${inSentence(whenLabel(booking.expiresAt))}`}
                subtitle={
                  booking.status === 'requested'
                    ? 'If there’s no answer by then, it closes on its own'
                    : 'If the deposit hasn’t arrived by then, the slot is released'
                }
              />
            )}
          {booking.deposit && (
            <ListRow
              icon={booking.deposit.status === 'received' ? BadgeCheck : Banknote}
              iconTone={booking.deposit.status === 'received' ? 'success' : 'neutral'}
              title={`${formatMoney(booking.deposit.amount)} deposit ${booking.deposit.status === 'received' ? 'received' : 'due'}`}
              subtitle={booking.deposit.method || undefined}
            />
          )}
          {balance && isLive(booking) && (
            <ListRow icon={Banknote} iconTone="neutral" title={balance} />
          )}
        </Glass>

        {booking.status === 'confirmed' && (
          <div className={styles.links}>
            {booking.calendarUrl && (
              <Button
                label="Add to calendar"
                icon={CalendarPlus}
                variant="secondary"
                size="md"
                href={booking.calendarUrl}
              />
            )}
            {booking.address && !booking.atClient && (
              <Button
                label="Directions"
                icon={Navigation}
                variant="secondary"
                size="md"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.address)}`}
              />
            )}
          </div>
        )}

        {booking.notes && (
          <Section title="What you told them">
            <Text variant="body" tone="secondary">
              {booking.notes}
            </Text>
          </Section>
        )}
        {booking.reason && (
          <Section title="What they said">
            <Text variant="body" tone="secondary">
              {booking.reason}
            </Text>
          </Section>
        )}

        {booking.status === 'confirmed' &&
          !booking.moves &&
          !booking.moveRequest &&
          !!booking.stylistHandle && (
            <Section
              title="Move it"
              footer="One move is free and keeps the deposit and the history. They have to agree."
            >
              {moving === undefined ? (
                <Button
                  label="Ask to move it"
                  variant="secondary"
                  size="md"
                  onClick={() => setMoving('')}
                />
              ) : (
                <div className={styles.move}>
                  <SlotPicker
                    query={{ handle: booking.stylistHandle, booking: id }}
                    stylistName={booking.stylistName}
                    availability={page?.profile.availability}
                    timeZone={zone}
                    value={moving || undefined}
                    onChange={iso => setMoving(iso ?? '')}
                  />
                  <div className={styles.answers}>
                    <Button
                      label="Ask them"
                      size="md"
                      loading={askMove.isPending}
                      disabled={!moving}
                      onClick={() =>
                        act(() =>
                          askMove
                            .mutateAsync({ id, at: moving })
                            .then(() => setMoving(undefined))
                            .catch(e => {
                              // Taken since she looked: show what's still free.
                              void refreshSlots();
                              throw e;
                            })
                        )
                      }
                    />
                    <Button
                      label="Keep it as it is"
                      size="md"
                      variant="ghost"
                      onClick={() => setMoving(undefined)}
                    />
                  </div>
                </div>
              )}
            </Section>
          )}

        {isLive(booking) && (
          <div className={styles.footer}>
            {cancelling ? (
              <Ask
                title={asking ? 'Withdraw your request?' : 'Cancel this booking?'}
                message={
                  asking
                    ? `${booking.stylistName} will be told, and the time goes back to them.`
                    : late
                      ? `It’s inside ${booking.stylistName}’s ${booking.policy.noticeHours}-hour window, so it counts against you and the deposit stays with them.`
                      : 'You’re in good time, so this costs you nothing.'
                }
              >
                <Button
                  label={asking ? 'Withdraw it' : 'Cancel it'}
                  size="sm"
                  loading={cancel.isPending}
                  onClick={() => act(() => cancel.mutateAsync(id).then(() => setCancelling(false)))}
                />
                <Button
                  label="Keep it"
                  size="sm"
                  variant="secondary"
                  onClick={() => setCancelling(false)}
                />
              </Ask>
            ) : (
              <Button
                label={asking ? 'Withdraw the request' : 'Cancel this booking'}
                variant="ghost"
                onClick={() => setCancelling(true)}
                fullWidth
              />
            )}
            <Text variant="caption" tone="tertiary">
              {asking
                ? 'Nothing is booked yet, so it costs you nothing.'
                : late
                  ? 'Cancelling now counts against you.'
                  : `Free to cancel until ${booking.policy.noticeHours} hours before.`}
            </Text>
          </div>
        )}

        {booking.status === 'completed' && <ReviewPart booking={booking} />}

        {booking.status === 'completed' && booking.stylistHandle && (
          <Section title={`Book ${booking.stylistName} again`}>
            <Glass radius="lg">
              <ListRow
                icon={Repeat}
                title="Book them again"
                subtitle="Pick from their menu"
                to={`/book/${booking.stylistHandle}`}
              />
            </Glass>
          </Section>
        )}

        <GetTheApp />
      </div>
    </Page>
  );
}

/** Her review: stars and a few words, once, checked before it goes on their page. */
function ReviewPart({ booking }: { booking: Booking }) {
  const review = useReview();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');

  if (booking.review) {
    return (
      <Glass radius="lg">
        <ListRow
          icon={MessageSquareHeart}
          iconTone="success"
          title={`Your review · ${booking.review.rating} of 5`}
          subtitle={
            booking.review.status === 'published'
              ? 'On their page'
              : booking.review.status === 'pending'
                ? 'Being checked before it goes up'
                : 'Taken down by moderation'
          }
        />
      </Glass>
    );
  }

  return (
    <Section
      title="Leave a review"
      footer="It helps the next person choose. It’s checked before it goes up."
    >
      <div className={styles.move}>
        <div className={styles.stars} role="radiogroup" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} of 5`}
              className={styles.star}
              onClick={() => setRating(n)}
            >
              <Star size={28} fill={n <= rating ? 'currentColor' : 'none'} aria-hidden />
            </button>
          ))}
        </div>
        <TextArea
          label="How was it?"
          rows={3}
          maxLength={1000}
          value={body}
          onChange={event => setBody(event.target.value)}
        />
        {review.isError && (
          <InlineAlert
            message={errorMessage(review.error, 'Check your connection and try again.')}
          />
        )}
        <Button
          label="Send review"
          size="md"
          disabled={!rating}
          loading={review.isPending}
          onClick={() => review.mutate({ id: booking.id, rating, body: body.trim() || undefined })}
        />
      </div>
    </Section>
  );
}
