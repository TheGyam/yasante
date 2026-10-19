import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CalendarClock, Car, Check, Circle, CircleCheck, House } from 'lucide-react';
import { POLICY_VERSION, useSession, withNext } from '@/features/auth';
import { useLook } from '@/features/looks';
import {
  estimate,
  formatDuration,
  formatServicePrice,
  hoursLabel,
  noticeLabel,
  optionGroups,
  useStylistPage,
  type ChosenOptions,
} from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { DEFAULT_CURRENCY, formatDistance, formatMoney } from '@/shared/lib/format';
import { POSTCODE, joinAddress, splitAddress } from '@/shared/lib/postcode';
import { readJson, writeJson } from '@/shared/lib/storage';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, TextArea } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Switch } from '@/shared/ui/Switch';
import { Text } from '@/shared/ui/Text';
import { inSentence, replyBy, whenLabel } from '../format';
import { useMyBookings, useRefreshFreeSlots, useRequestBooking, useWatchSlots } from '../hooks';
import { GetTheApp } from './GetTheApp';
import { SlotPicker } from './SlotPicker';
import * as styles from './BookScreen.css';

/** What she's filled in, kept for this tab: signing in halfway loses nothing. */
interface Draft {
  serviceId?: string;
  chosen: ChosenOptions;
  time?: string;
  ownHair: boolean;
  notes: string;
  atClient: boolean;
  /** Unset until she types one: her last home visit's address fills in meanwhile. */
  street?: string;
  postcode?: string;
}
const EMPTY: Draft = { chosen: {}, ownHair: false, notes: '', atClient: false };
const draftKey = (handle: string) => `yasante.booking-draft.${handle}`;

export interface BookScreenProps {
  handle: string;
  /** "Book this look": the service it was, and the look itself to show the stylist. */
  serviceId?: string;
  lookId?: string;
  /** An opened slot: the day to open on, yyyy-MM-dd. */
  day?: string;
}

/**
 * Asking for an appointment, as in the app (app/book/[handle].tsx): her real free times,
 * her prices, her terms. Anyone can fill it in; sending needs an account, and what's
 * filled in waits here while she makes one.
 */
export function BookScreen({ handle, serviceId: fromLookService, lookId, day }: BookScreenProps) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const session = useSession();
  const page = useStylistPage(handle);
  const { data: fromLook } = useLook(lookId ?? '');
  const request = useRequestBooking();
  const [sent, setSent] = useState<{ id: string; name: string; until?: string }>();

  const [draft, setDraft] = useState<Draft>(
    () => readJson<Draft>(draftKey(handle), 'session') ?? { ...EMPTY, serviceId: fromLookService }
  );
  const set = (changes: Partial<Draft>) => setDraft(current => ({ ...current, ...changes }));
  useEffect(
    () => writeJson(draftKey(handle), sent ? undefined : draft, 'session'),
    [draft, handle, sent]
  );
  const [accepted, setAccepted] = useState(false);

  // The address from her last home visit, so it's typed once.
  const { data: past = [] } = useMyBookings(!!session?.user.emailVerified);
  const lastHome = splitAddress(past.find(b => b.atClient && b.address)?.address);
  const street = draft.street ?? lastHome.street;
  const postcode = draft.postcode ?? lastHome.postcode;

  const menu = page.data?.menu;
  const service = useMemo(
    () => menu?.find(item => item.id === draft.serviceId),
    [menu, draft.serviceId]
  );
  // Her free times depend on how long the job runs, so they follow the options.
  const optionIds = Object.values(draft.chosen).filter((id): id is string => !!id);
  const quote = service ? estimate(service, draft.chosen) : undefined;
  const time = draft.time;
  const refreshSlots = useRefreshFreeSlots();
  const watch = useWatchSlots();

  if (page.isPending) {
    return (
      <Page title="Request a booking">
        <div className={styles.column}>
          <Skeleton style={{ height: 320, borderRadius: 20 }} />
        </div>
      </Page>
    );
  }
  if (page.isError || !page.data) {
    return (
      <Page title="Request a booking">
        <EmptyState
          as="h1"
          title="Couldn’t open their page"
          body={errorMessage(page.error, 'They may not be taking bookings. Try again in a moment.')}
          action={<Button label="See looks" variant="secondary" size="md" to="/looks" />}
        />
      </Page>
    );
  }

  const { profile } = page.data;
  const currency = profile.currency ?? DEFAULT_CURRENCY;

  if (sent) {
    return (
      <Page title={`Sent to ${sent.name}`}>
        <div className={styles.sent} aria-live="polite">
          <div className={styles.sentTick}>
            <Check size={46} strokeWidth={2.8} aria-hidden />
          </div>
          <Text variant="title1" as="h1">
            Sent to {sent.name}
          </Text>
          <Text variant="body" tone="secondary">
            {sent.until
              ? `They have until ${inSentence(whenLabel(sent.until, profile.timeZone))} to reply.`
              : 'They’ll reply soon.'}{' '}
            We’ll email you the moment they do.
          </Text>
          <div className={styles.actions}>
            <Button label="See your booking" to={`/bookings/${sent.id}`} fullWidth />
            <Button label="All your bookings" variant="secondary" to="/bookings" fullWidth />
          </div>
          <GetTheApp />
        </div>
      </Page>
    );
  }

  const groups = service ? optionGroups(service) : [];
  const groupNames = groups.map(g => g.name.toLowerCase()).join(' and ');
  const depositDue =
    profile.policies.depositType === 'none' || !quote
      ? 0
      : profile.policies.depositType === 'percent'
        ? Math.round((quote.price * (profile.policies.depositAmount ?? 0)) / 100)
        : (profile.policies.depositAmount ?? 0);

  const offers = profile.serviceModels;
  const travels = offers.includes('mobile');
  const hosts = offers.some(m => m !== 'mobile');
  // A stylist who only travels always comes to the client.
  const comesToMe = travels && (draft.atClient || !hosts);
  const addressReady = !!street.trim() && POSTCODE.test(postcode.trim());

  // The button stays off until everything's there; say what's left, so it never looks broken.
  const missing = !service
    ? 'Pick a service to send a request.'
    : !quote?.complete
      ? `Pick your ${groupNames}.`
      : !time
        ? 'Pick a time to send your request.'
        : comesToMe && !addressReady
          ? 'Add your street and postcode so they can get to you.'
          : !accepted
            ? 'Tick their terms above to send.'
            : undefined;

  const send = () => {
    if (!service || !time) return;
    // Signed out: an account first, then straight back here with everything still filled in.
    if (!session) {
      navigate(withNext('/auth/signup?role=client', pathname + search));
      return;
    }
    if (!session.user.emailVerified) {
      navigate(withNext('/auth/verify-email', pathname + search));
      return;
    }
    request.mutate(
      {
        stylistId: profile.accountId,
        serviceId: service.id,
        options: draft.chosen,
        bringingOwnHair: draft.ownHair,
        requestedTimes: [time],
        notes: draft.notes.trim() || undefined,
        policyVersion: POLICY_VERSION,
        lookId: fromLook?.id,
        atClient: comesToMe,
        clientAddress: comesToMe ? joinAddress(street, postcode) : undefined,
      },
      {
        onSuccess: booking =>
          setSent({ id: booking.id, name: profile.displayName, until: booking.expiresAt }),
        // Someone may have got there first: show what's still free.
        onError: () => void refreshSlots(),
      }
    );
  };

  return (
    <Page title={`Book ${profile.displayName}`}>
      <div className={styles.column}>
        <div className={styles.group}>
          <Text variant="title1" as="h1">
            Book {profile.displayName}
          </Text>
          <Text variant="subhead" tone="secondary">
            <Link to={`/${profile.handle}`}>
              <Text variant="subhead" tone="accent">
                See their page
              </Text>
            </Link>{' '}
            · {profile.baseArea}
          </Text>
        </div>

        {fromLook && (
          <Glass radius="lg" className={styles.look}>
            <img
              src={fromLook.thumbUri ?? fromLook.feedUri ?? fromLook.photoUri}
              alt=""
              className={styles.lookPhoto}
            />
            <div>
              <Text variant="overline" tone="tertiary">
                Booking this look
              </Text>
              <Text variant="callout" lines={2}>
                {fromLook.caption || fromLook.serviceName || 'The look you picked'}
              </Text>
              <Text variant="footnote" tone="secondary">
                {profile.displayName} will see it with your request
              </Text>
            </div>
          </Glass>
        )}

        <div className={styles.group}>
          <Text variant="footnote" tone="secondary" id="services-label">
            What would you like?
          </Text>
          <div className={styles.services} role="radiogroup" aria-labelledby="services-label">
            {page.data.menu.map(item => {
              const on = item.id === draft.serviceId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`${item.name}, ${formatServicePrice(item, currency)}`}
                  className={styles.service}
                  onClick={() => {
                    if (on) return;
                    // A time picked for another service may not fit this one.
                    set({ serviceId: item.id, chosen: {}, time: undefined });
                  }}
                >
                  <span className={styles.serviceText}>
                    <Text variant="callout">{item.name}</Text>
                    {(item.durationMinutes || item.note) && (
                      <Text variant="footnote" tone="secondary">
                        {item.durationMinutes ? formatDuration(item.durationMinutes) : item.note}
                      </Text>
                    )}
                  </span>
                  <span className={styles.price}>{formatServicePrice(item, currency)}</span>
                  {on ? (
                    <CircleCheck size={20} className={styles.tick} aria-hidden />
                  ) : (
                    <Circle size={20} className={styles.dot} aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {groups.map(({ group, name, choices }) => (
          <div key={group} className={styles.group}>
            <Text variant="footnote" tone="secondary">
              {name}
            </Text>
            <div className={styles.chips}>
              {choices.map((choice, index) => (
                <Chip
                  key={choice.id}
                  label={
                    index === 0
                      ? choice.label
                      : `${choice.label} · +${formatMoney(choice.add, currency)}`
                  }
                  selected={draft.chosen[group] === choice.id}
                  // A longer job may not fit the time picked for a shorter one.
                  onClick={() =>
                    set({ chosen: { ...draft.chosen, [group]: choice.id }, time: undefined })
                  }
                />
              ))}
            </div>
          </div>
        ))}

        {service && quote && (
          <Section
            title="What it comes to"
            footer={
              quote.complete
                ? 'Worked out from their own price list. They confirm it when they accept.'
                : `Pick your ${groupNames} to see what it comes to.`
            }
          >
            <ListRow
              icon={CalendarClock}
              title={[service.name, ...quote.labels].join(' · ')}
              subtitle={
                [
                  quote.minutes ? `About ${formatDuration(quote.minutes)}` : undefined,
                  service.hairIncluded ? 'Hair included' : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              value={`${quote.fromPrice ? 'from ' : ''}${formatMoney(quote.price, currency)}`}
            />
            {depositDue > 0 && (
              <ListRow
                title="Deposit to confirm"
                subtitle="Paid straight to them, once they accept"
                value={formatMoney(depositDue, currency)}
              />
            )}
          </Section>
        )}

        <div className={styles.group}>
          <Text variant="footnote" tone="secondary">
            {!service
              ? 'Pick a service to see when they’re free.'
              : !quote?.complete
                ? `Pick your ${groupNames} to see when they’re free.`
                : `When suits you? They ${hoursLabel(profile.availability) ? `work ${hoursLabel(profile.availability)}, and ` : ''}need ${noticeLabel(profile.availability?.leadHours)}.`}
          </Text>
          {quote?.complete && service && (
            <SlotPicker
              query={{ handle, serviceId: service.id, optionIds }}
              stylistName={profile.displayName}
              availability={profile.availability}
              timeZone={profile.timeZone}
              value={time}
              onChange={time => set({ time })}
              initialDay={day}
              onWatch={async (from, to) => {
                // Being told needs an account: make one, then come back here.
                if (!session?.user.emailVerified) {
                  navigate(
                    withNext(session ? '/auth/verify-email' : '/auth/login', pathname + search)
                  );
                  throw new Error('Sign in first');
                }
                await watch.mutateAsync({ stylistId: profile.accountId, from, to });
              }}
            />
          )}
          {watch.isError && (
            <InlineAlert message={errorMessage(watch.error, 'Couldn’t add you. Try again.')} />
          )}
        </div>

        {travels && (
          <div className={styles.group}>
            <Text variant="footnote" tone="secondary">
              {hosts ? 'Where?' : `${profile.displayName} comes to you`}
            </Text>
            {hosts && (
              <div className={styles.chips}>
                <Chip
                  label={`At theirs · ${profile.baseArea}`}
                  icon={House}
                  selected={!draft.atClient}
                  onClick={() => set({ atClient: false })}
                />
                <Chip
                  label="Come to me"
                  icon={Car}
                  selected={draft.atClient}
                  onClick={() => set({ atClient: true })}
                />
              </div>
            )}
            {comesToMe && (
              <>
                <Input
                  label="Your house number and street"
                  placeholder="4 Choumert Grove"
                  autoComplete="street-address"
                  value={street}
                  onChange={event => set({ street: event.target.value })}
                />
                <Input
                  label="Your postcode"
                  placeholder="SE15 4RB"
                  autoComplete="postal-code"
                  maxLength={8}
                  value={postcode}
                  onChange={event => set({ postcode: event.target.value })}
                  hint={`They see your postcode area first${profile.travelRadiusMiles ? ` (they travel up to ${formatDistance(profile.travelRadiusMiles)} from ${profile.baseArea})` : ''}, and your street once they confirm.`}
                />
              </>
            )}
          </div>
        )}

        <Switch
          label="I’m bringing my own hair"
          hint="They’ll know not to order hair for you."
          checked={draft.ownHair}
          onChange={event => set({ ownHair: event.target.checked })}
        />

        <TextArea
          label="Anything they should know"
          placeholder="My hair is shoulder length and I’d like it waist length"
          rows={3}
          maxLength={1000}
          value={draft.notes}
          onChange={event => set({ notes: event.target.value })}
        />

        <Checkbox checked={accepted} onChange={setAccepted}>
          <Text variant="footnote" tone="secondary">
            I accept {profile.displayName}’s terms: {profile.policies.noticeHours} hours’ notice to
            cancel
            {profile.policies.depositType === 'none'
              ? '.'
              : ', and the deposit is paid directly to them.'}
          </Text>
        </Checkbox>

        {request.isError && (
          <InlineAlert
            message={errorMessage(request.error, 'Check your connection and try again.')}
          />
        )}

        <div className={styles.footer}>
          <Button
            label={session ? 'Send request' : 'Create an account to send'}
            onClick={send}
            disabled={!!missing}
            loading={request.isPending}
            fullWidth
          />
          <Text variant="caption" tone="tertiary">
            {missing ??
              (session
                ? `${whenLabel(time!, profile.timeZone)}. They have until ${inSentence(whenLabel(replyBy(time!).toISOString(), profile.timeZone))} to reply.`
                : 'It takes a minute. Everything you’ve picked stays here.')}
          </Text>
          {!session && (
            <Text variant="footnote" tone="secondary">
              Already on Yasante?{' '}
              <Link to={withNext('/auth/login', pathname + search)}>
                <Text variant="footnote" tone="accent">
                  Sign in
                </Text>
              </Link>
            </Text>
          )}
        </div>
      </div>
    </Page>
  );
}
