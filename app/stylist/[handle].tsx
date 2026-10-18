import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  BellRing,
  CalendarPlus,
  Clock,
  MessageCircleReply,
  Timer,
  MapPin,
  MoreHorizontal,
  Scissors,
  Store,
  WifiOff,
} from 'lucide-react-native';
import {
  VERIFICATION_LABELS,
  formatDuration,
  formatPrice,
  isNotFound,
  hoursLabel,
  replyLabel,
  timingLabelText,
  useStylistPage,
} from '@/features/stylist';
import { useAuth } from '@/features/auth';
import { ReviewCard } from '@/features/booking';
import { formatMoney } from '@/shared/lib/format';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { PressableScale } from '@/shared/ui/PressableScale';
import { PhotoCount } from '@/shared/ui/PhotoCount';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StarRating } from '@/shared/ui/StarRating';
import { Text } from '@/shared/ui/Text';
import { track } from '@/shared/lib/analytics';

/** A page opens on a few of each, and grows a step at a time. */
const PHOTOS_STEP = 6;
const REVIEWS_STEP = 3;

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  identity: { alignItems: 'center', gap: space.sm },
  names: { alignItems: 'center', gap: 2 },
  work: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  photo: { width: '31%', aspectRatio: 0.8, borderRadius: radius.sm, overflow: 'hidden' },
  photoFill: { flex: 1 },
  reviews: { gap: space.sm },
  reviewsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  average: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
}));

/**
 * Her page, as a client sees it: the work, the prices, the terms, and one way in.
 * Everything here is what the plan says clients may see — the district, never the
 * address, and a badge that says what was actually checked.
 */
export default function StylistPageScreen() {
  const styles = useStyles();
  const router = useRouter();
  // Arriving from a look she wants done here, the request carries that look.
  const { handle, look } = useLocalSearchParams<{ handle: string; look?: string }>();
  const { data, isLoading, isError, error, refetch } = useStylistPage(handle);
  const { user } = useAuth();
  const [photosShown, setPhotosShown] = useState(PHOTOS_STEP);
  const [reviewsShown, setReviewsShown] = useState(REVIEWS_STEP);
  useEffect(() => {
    track('view_stylist', { handle });
  }, [handle]);

  if (isLoading) {
    return (
      <Screen back testID="stylist-page">
        <Skeleton height={280} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen back testID="stylist-page">
        <EmptyState
          icon={isNotFound(error) ? Store : WifiOff}
          title={isNotFound(error) ? 'No page here' : 'Couldn’t load this page'}
          message={
            isNotFound(error)
              ? 'This stylist doesn’t have a live page.'
              : 'Check your connection and try again.'
          }
          actionLabel={isError && !isNotFound(error) ? 'Try again' : undefined}
          onAction={isError && !isNotFound(error) ? () => refetch() : undefined}
        />
      </Screen>
    );
  }

  const { profile, menu, photos, confirmedStyles, reviews, rating, responseHours, timingLabel } =
    data;
  const reply = replyLabel(responseHours);
  const timing = timingLabelText(timingLabel);
  const deposit =
    profile.policies.depositType === 'none'
      ? 'No deposit'
      : profile.policies.depositType === 'percent'
        ? `${profile.policies.depositAmount}% deposit`
        : `${formatMoney(profile.policies.depositAmount ?? 0)} deposit`;

  return (
    <Screen
      back
      title={profile.displayName}
      // Her name is already under her photo; the bar shows it once she's scrolled past.
      titleBlock={false}
      headerRight={
        profile.accountId === user?.id ? undefined : (
          <IconButton
            icon={MoreHorizontal}
            size={36}
            accessibilityLabel={`Report or block ${profile.displayName}`}
            onPress={() =>
              router.push(
                `/looks/options?kind=profile&id=${profile.accountId}&authorId=${profile.accountId}&name=${encodeURIComponent(profile.displayName)}&mine=0&leave=1`
              )
            }
            testID="stylist-page-more"
          />
        )
      }
      testID="stylist-page"
    >
      <View style={styles.body}>
        <View style={styles.identity}>
          <Avatar uri={profile.avatarUri} name={profile.displayName} size={88} />
          <View style={styles.names}>
            <Text variant="title1" accessibilityRole="header">
              {profile.displayName}
            </Text>
            <Text variant="subhead" tone="secondary">
              @{profile.handle}
            </Text>
          </View>
          {!!profile.bio && (
            <Text variant="body" tone="secondary" align="center">
              {profile.bio}
            </Text>
          )}
        </View>

        <Button
          label="Request a booking"
          icon={CalendarPlus}
          onPress={() => router.push(`/book/${profile.handle}${look ? `?look=${look}` : ''}`)}
          disabled={!menu.length}
          fullWidth
          testID="stylist-page-book"
        />
        {profile.accountId !== user?.id && (
          <Button
            label="Tell me if a slot opens"
            icon={BellRing}
            variant="ghost"
            onPress={() => router.push(`/waitlist/${profile.handle}`)}
            fullWidth
            style={{ marginTop: -space.lg }}
            testID="stylist-page-waitlist"
          />
        )}

        <Section>
          <ListRow
            title={profile.baseArea}
            subtitle={
              profile.serviceModels.includes('mobile') && profile.travelRadiusMiles
                ? `Travels up to ${profile.travelRadiusMiles} miles`
                : 'District only — the address comes with a confirmed booking'
            }
            icon={MapPin}
            iconTone="neutral"
          />
          <ListRow
            title={VERIFICATION_LABELS[profile.verificationTier]}
            subtitle={
              confirmedStyles
                ? `${confirmedStyles} ${confirmedStyles === 1 ? 'style' : 'styles'} confirmed by clients`
                : undefined
            }
            icon={BadgeCheck}
            iconTone={profile.verificationTier > 0 ? 'success' : 'neutral'}
          />
          {!!hoursLabel(profile.availability) && (
            <ListRow title={hoursLabel(profile.availability)!} icon={Clock} iconTone="neutral" />
          )}
          {!!reply && <ListRow title={reply} icon={MessageCircleReply} iconTone="neutral" />}
          {!!timing && (
            <ListRow
              title={timing}
              subtitle="Only counts the times that were down to them"
              icon={Timer}
              iconTone="success"
            />
          )}
        </Section>

        {menu.length > 0 && (
          <Section title="Menu" footer="Prices are theirs, and what you'd be quoted.">
            {menu.map(item => (
              <ListRow
                key={item.id}
                title={item.name}
                subtitle={
                  [
                    item.durationMinutes ? formatDuration(item.durationMinutes) : item.note,
                    item.options?.length ? 'priced by length and size' : undefined,
                    item.hairIncluded ? 'hair included' : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · ') || undefined
                }
                value={formatPrice(item)}
                icon={Scissors}
              />
            ))}
          </Section>
        )}

        {photos.length > 0 && (
          <View>
            <Text variant="overline" tone="tertiary">
              Their work
            </Text>
            <View style={[styles.work, { marginTop: space.sm }]}>
              {photos.slice(0, photosShown).map((photo, index) => (
                // The box is sized; the picture fills it. (Sized on the image itself,
                // Android drew every photo zero pixels tall.)
                <PressableScale
                  key={photo.id}
                  // The size on the outside, where the grid lays it out.
                  containerStyle={styles.photo}
                  style={styles.photoFill}
                  onPress={() => router.push(`/work/${profile.handle}?index=${index}`)}
                  accessibilityRole="imagebutton"
                  accessibilityHint="Opens it full screen"
                >
                  <RemoteImage
                    uri={photo.thumbUri ?? photo.uri}
                    style={StyleSheet.absoluteFill}
                    recyclingKey={photo.id}
                    accessibilityLabel={[
                      menu.find(item => item.id === photo.serviceId)?.name ?? 'Their work',
                      `photo ${index + 1} of ${photos.length}`,
                      photo.lookPhotos ? `${photo.lookPhotos.length} photos` : '',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  />
                  {!!photo.lookPhotos && <PhotoCount count={photo.lookPhotos.length} />}
                </PressableScale>
              ))}
            </View>
            {photos.length > photosShown && (
              <Button
                label={`Show more work (${photos.length - photosShown})`}
                variant="ghost"
                onPress={() => setPhotosShown(n => n + PHOTOS_STEP)}
                fullWidth
              />
            )}
          </View>
        )}

        <View style={styles.reviews}>
          <View style={styles.reviewsHead}>
            <Text variant="overline" tone="tertiary">
              Reviews
            </Text>
            {!!rating && (
              <View style={styles.average}>
                <StarRating value={Math.round(rating.average)} size={12} />
                <Text variant="footnote" tone="secondary">
                  {rating.average.toFixed(1)} · {rating.count}{' '}
                  {rating.count === 1 ? 'review' : 'reviews'}
                </Text>
              </View>
            )}
          </View>
          {reviews.length ? (
            reviews
              .slice(0, reviewsShown)
              .map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onReport={r =>
                    router.push(
                      `/review/report?id=${r.id}&author=${encodeURIComponent(r.authorName)}`
                    )
                  }
                />
              ))
          ) : (
            <Text variant="subhead" tone="secondary">
              No reviews yet. Only clients who’ve had a completed appointment can leave one.
            </Text>
          )}
          {reviews.length > reviewsShown && (
            <Button
              label={`Show more reviews (${reviews.length - reviewsShown})`}
              variant="ghost"
              onPress={() => setReviewsShown(n => n + REVIEWS_STEP)}
              fullWidth
            />
          )}
        </View>

        <Section title="Their terms" footer="You'll be asked to accept these when you book.">
          <ListRow
            title={`${profile.policies.noticeHours} hours' notice to cancel`}
            subtitle="Cancel inside that window and it counts against you"
            icon={Clock}
            iconTone="neutral"
          />
          <ListRow
            title={deposit}
            subtitle="Paid straight to them — Yasante never handles it"
            icon={Store}
            iconTone="neutral"
          />
        </Section>
      </View>
    </Screen>
  );
}
