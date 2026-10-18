import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  BadgeCheck,
  CalendarPlus,
  Check,
  Clock,
  MapPin,
  MessageCircleReply,
  Scissors,
  Store,
  Timer,
  UserRoundX,
} from 'lucide-react';
import { useSession, withNext } from '@/features/auth';
import { errorMessage, isNotFound } from '@/shared/lib/errors';
import { formatMonth, plural } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Link } from '@/shared/ui/Link';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { PhotoCount } from '@/shared/ui/PhotoCount';
import { Pill } from '@/shared/ui/Pill';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Rise } from '@/shared/ui/Rise';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useStylistPage, useTogglePageWaitlist } from '../hooks';
import {
  VERIFICATION_LABELS,
  depositLabel,
  formatPrice,
  hoursLabel,
  replyLabel,
  serviceDetails,
  timingLabelText,
  whereLabel,
} from '../format';
import type { StylistPage } from '../types';
import { StarRating } from './StarRating';
import * as styles from './StylistScreen.css';

const PHOTOS_STEP = 12;
const REVIEWS_STEP = 4;

/** Her page, at yasante.com/{handle}: the link in her bio. */
export function StylistScreen({ handle }: { handle: string }) {
  const { data, isPending, error, refetch } = useStylistPage(handle);

  if (isPending) return <Loading />;

  if (!data) {
    return (
      <Page title={isNotFound(error) ? 'No page here' : 'Couldn’t load this page'}>
        <EmptyState
          as="h1"
          icon={UserRoundX}
          title={isNotFound(error) ? 'No page here' : 'Couldn’t load this page'}
          body={
            isNotFound(error)
              ? `Nobody on Yasante goes by @${handle}. Check the spelling, or look through the stylists’ work instead.`
              : errorMessage(error, 'Please try again in a moment.')
          }
          action={
            isNotFound(error) ? (
              <Button label="See looks" variant="secondary" size="md" to="/looks" />
            ) : (
              <Button label="Try again" variant="secondary" size="md" onClick={() => refetch()} />
            )
          }
        />
      </Page>
    );
  }

  return <Stylist page={data} />;
}

function Stylist({ page }: { page: StylistPage }) {
  const { profile, menu, photos, confirmedStyles, reviews, rating, responseHours, timingLabel } =
    page;
  const [photosShown, setPhotosShown] = useState(PHOTOS_STEP);
  const [reviewsShown, setReviewsShown] = useState(REVIEWS_STEP);
  const [showClaimNote, setShowClaimNote] = useState(false);
  const reply = replyLabel(responseHours);
  const timing = timingLabelText(timingLabel);
  const hours = hoursLabel(profile.availability);

  return (
    <Page
      title={`${profile.displayName} (@${profile.handle})`}
      description={`${profile.bio?.slice(0, 150) || 'Stylist'} · ${profile.baseArea}`}
      noIndex={profile.featured}
    >
      <div className={styles.layout}>
        <aside className={styles.aside}>
          <Glass padded radius="xl">
            <div className={styles.identity}>
              <Avatar name={profile.displayName} uri={profile.avatarUri} size={96} />
              <div className={styles.names}>
                <div className={styles.nameHeading}>
                  <Text variant="title1">{profile.displayName}</Text>
                  {profile.featured && <Pill tone="neutral">Featured</Pill>}
                </div>
                <Text variant="subhead" tone="secondary">
                  {profile.featured ? 'Not taking bookings on Yasante yet' : `@${profile.handle}`}
                </Text>
              </div>
              {!profile.featured && rating && (
                <span className={styles.average}>
                  <StarRating value={Math.round(rating.average)} size={13} />
                  <Text variant="footnote" tone="secondary">
                    {rating.average.toFixed(1)} · {plural(rating.count, 'review')}
                  </Text>
                </span>
              )}
              {profile.bio && (
                <Text variant="body" tone="secondary" className={styles.bio}>
                  {profile.bio}
                </Text>
              )}
            </div>
            <div className={styles.book}>
              {profile.featured ? (
                <FeaturedButtons page={page} />
              ) : (
                <>
                  <Button
                    label="Request a booking"
                    icon={CalendarPlus}
                    to={`/book/${profile.handle}`}
                    fullWidth
                  />
                  <Text variant="footnote" tone="tertiary">
                    Right here, no app needed. They reply within 48 hours.
                  </Text>
                </>
              )}
            </div>
          </Glass>

          <Section>
            <ListRow
              icon={MapPin}
              iconTone="neutral"
              title={profile.baseArea}
              subtitle={whereLabel(profile)}
            />
            {!profile.featured && (
              <ListRow
                icon={BadgeCheck}
                iconTone={profile.verificationTier > 0 ? 'success' : 'neutral'}
                title={VERIFICATION_LABELS[profile.verificationTier]}
                subtitle={
                  confirmedStyles
                    ? `${plural(confirmedStyles, 'style')} confirmed by clients`
                    : undefined
                }
              />
            )}
            {!profile.featured && hours && <ListRow icon={Clock} iconTone="neutral" title={hours} />}
            {!profile.featured && reply && <ListRow icon={MessageCircleReply} iconTone="neutral" title={reply} />}
            {!profile.featured && timing && (
              <ListRow
                icon={Timer}
                iconTone="success"
                title={timing}
                subtitle="Only counts the times that were down to them"
              />
            )}
          </Section>
        </aside>

        <Rise className={styles.main}>
          {!profile.featured && menu.length > 0 && (
            <Section title="Menu" footer="Prices are theirs, and what you’d be quoted.">
              {menu.map(item => (
                <ListRow
                  key={item.id}
                  icon={Scissors}
                  title={item.name}
                  subtitle={serviceDetails(item)}
                  value={formatPrice(item)}
                />
              ))}
            </Section>
          )}

          {photos.length > 0 && (
            <section>
              <div className={styles.subhead}>
                <Text variant="overline" tone="tertiary" as="h2">
                  Their work
                </Text>
              </div>
              <div className={styles.work}>
                {photos.slice(0, photosShown).map((photo, index) => {
                  const label = [
                    menu.find(item => item.id === photo.serviceId)?.name ?? 'Their work',
                    `photo ${index + 1} of ${photos.length}`,
                  ].join(', ');
                  const image = (
                    <>
                      <RemoteImage src={photo.thumbUri ?? photo.uri} alt={label} aspect={1} />
                      {!!photo.lookPhotos && <PhotoCount count={photo.lookPhotos.length} />}
                    </>
                  );
                  return photo.lookId ? (
                    <Link key={photo.id} to={`/looks/${photo.lookId}`} className={styles.workLink}>
                      {image}
                    </Link>
                  ) : (
                    <div key={photo.id}>{image}</div>
                  );
                })}
              </div>
              {photos.length > photosShown && (
                <div className={styles.more}>
                  <Button
                    label={`Show more work (${photos.length - photosShown})`}
                    variant="ghost"
                    size="md"
                    onClick={() => setPhotosShown(n => n + PHOTOS_STEP)}
                  />
                </div>
              )}
            </section>
          )}

          {!profile.featured && (
            <section>
              <div className={styles.subhead}>
                <Text variant="overline" tone="tertiary" as="h2">
                  Reviews
                </Text>
              </div>
              {reviews.length ? (
                <div className={styles.reviews}>
                  {reviews.slice(0, reviewsShown).map(review => (
                    <Glass key={review.id} padded radius="lg" className={styles.review}>
                      <div className={styles.reviewHead}>
                        <StarRating value={review.rating} />
                        <Text variant="footnote" tone="tertiary">
                          {formatMonth(review.createdAt)}
                        </Text>
                      </div>
                      {review.body && <Text variant="body">{review.body}</Text>}
                      <Text variant="footnote" tone="secondary">
                        {review.authorName} · {review.serviceName}
                      </Text>
                    </Glass>
                  ))}
                </div>
              ) : (
                <Glass padded radius="lg">
                  <Text variant="subhead" tone="secondary">
                    No reviews yet. Only clients who’ve had a completed appointment can leave one.
                  </Text>
                </Glass>
              )}
              {reviews.length > reviewsShown && (
                <div className={styles.more}>
                  <Button
                    label={`Show more reviews (${reviews.length - reviewsShown})`}
                    variant="ghost"
                    size="md"
                    onClick={() => setReviewsShown(n => n + REVIEWS_STEP)}
                  />
                </div>
              )}
            </section>
          )}

          {!profile.featured && (
            <Section title="Their terms" footer="You’ll be asked to accept these when you book.">
              <ListRow
                icon={Clock}
                iconTone="neutral"
                title={`${profile.policies.noticeHours} hours’ notice to cancel`}
                subtitle="Cancel inside that window and it counts against you"
              />
              <ListRow
                icon={Store}
                iconTone="neutral"
                title={depositLabel(profile.policies)}
                subtitle="Paid straight to them — Yasante never handles it"
              />
            </Section>
          )}
        </Rise>
      </div>

      {profile.claimable && (
        <div className={styles.claimFooter}>
          {showClaimNote ? (
            <Text variant="footnote" tone="secondary" className={styles.claimNote}>
              Message{' '}
              <a
                href="https://www.instagram.com/yasante/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.inlineInstagramLink}
              >
                @yasante
              </a>{' '}
              on Instagram from @{profile.instagramHandle ?? profile.handle} and we'll send you a link to make this page yours.
            </Text>
          ) : (
            <button
              type="button"
              className={styles.claimTrigger}
              onClick={() => setShowClaimNote(true)}
            >
              Is this you? Make this page yours.
            </button>
          )}
        </div>
      )}
    </Page>
  );
}

function FeaturedButtons({ page }: { page: StylistPage }) {
  const { profile } = page;
  const session = useSession();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toggleWaitlist = useTogglePageWaitlist(profile.handle);
  const [error, setError] = useState<string>();
  const autoJoinRef = useRef(false);

  const joined = page.waitlistJoined === true;
  const signedIn = page.waitlistJoined !== undefined;

  useEffect(() => {
    if (
      session &&
      searchParams.get('waitlist') === '1' &&
      !page.waitlistJoined &&
      !autoJoinRef.current
    ) {
      autoJoinRef.current = true;
      toggleWaitlist.mutate(true, {
        onError: err => setError(errorMessage(err, "Couldn't join the waitlist")),
      });
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.delete('waitlist');
          return next;
        },
        { replace: true }
      );
    }
  }, [session, searchParams, page.waitlistJoined, setSearchParams, toggleWaitlist]);

  return (
    <div className={styles.featuredButtons}>
      <Button
        label="Book on Instagram"
        href={`https://www.instagram.com/${profile.instagramHandle ?? profile.handle}/`}
        target="_blank"
        rel="noopener noreferrer"
        fullWidth
      />
      {signedIn && session ? (
        <Button
          label={joined ? 'On the waitlist' : 'Join the waitlist'}
          icon={joined ? Check : undefined}
          variant="secondary"
          loading={toggleWaitlist.isPending}
          onClick={() => {
            setError(undefined);
            toggleWaitlist.mutate(!joined, {
              onError: err => setError(errorMessage(err, "Couldn't update waitlist")),
            });
          }}
          fullWidth
        />
      ) : (
        <Button
          label="Join the waitlist"
          variant="secondary"
          onClick={() => navigate(withNext('/auth/login', `/${profile.handle}?waitlist=1`))}
          fullWidth
        />
      )}
      {error && <InlineAlert message={error} />}
      <Text variant="footnote" tone="tertiary">
        We'll let you know when {profile.displayName} takes bookings.
      </Text>
    </div>
  );
}

function Loading() {
  return (
    <Page title="Stylist">
      <div className={styles.layout} aria-busy>
        <Glass padded radius="xl">
          <div className={styles.identity}>
            <Skeleton style={{ width: 96, height: 96, borderRadius: '50%' }} />
            <Skeleton style={{ width: 180, height: 30 }} />
            <Skeleton style={{ width: 100, height: 18 }} />
          </div>
        </Glass>
        <div>
          <Skeleton style={{ height: 240, borderRadius: 20 }} />
        </div>
      </div>
    </Page>
  );
}
