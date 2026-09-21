import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  CalendarPlus,
  Clock,
  MapPin,
  Scissors,
  Store,
  WifiOff,
} from 'lucide-react-native';
import {
  VERIFICATION_LABELS,
  formatDuration,
  formatPrice,
  isNotFound,
  useStylistPage,
} from '@/features/stylist';
import { formatMoney } from '@/shared/lib/format';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  identity: { alignItems: 'center', gap: space.sm },
  names: { alignItems: 'center', gap: 2 },
  work: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  photo: { width: '31%', aspectRatio: 0.8, borderRadius: radius.sm },
}));

/**
 * Her page, as a client sees it: the work, the prices, the terms, and one way in.
 * Everything here is what the plan says clients may see — the district, never the
 * address, and a badge that says what was actually checked.
 */
export default function StylistPageScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { data, isLoading, isError, error, refetch } = useStylistPage(handle);

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
          title={isNotFound(error) ? 'No page here' : 'Couldn’t load her page'}
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

  const { profile, menu, photos, confirmedStyles } = data;
  const deposit =
    profile.policies.depositType === 'none'
      ? 'No deposit'
      : profile.policies.depositType === 'percent'
        ? `${profile.policies.depositAmount}% deposit`
        : `${formatMoney(profile.policies.depositAmount ?? 0)} deposit`;

  return (
    <Screen back title={profile.displayName} testID="stylist-page">
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
          onPress={() => router.push(`/book/${profile.handle}`)}
          disabled={!menu.length}
          fullWidth
          testID="stylist-page-book"
        />

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
        </Section>

        {menu.length > 0 && (
          <Section title="Menu" footer="Prices are hers, and what you'd be quoted.">
            {menu.map(item => (
              <ListRow
                key={item.id}
                title={item.name}
                subtitle={item.durationMinutes ? formatDuration(item.durationMinutes) : item.note}
                value={formatPrice(item)}
                icon={Scissors}
              />
            ))}
          </Section>
        )}

        {photos.length > 0 && (
          <View>
            <Text variant="overline" tone="tertiary">
              Her work
            </Text>
            <View style={[styles.work, { marginTop: space.sm }]}>
              {photos.slice(0, 9).map(photo => (
                <RemoteImage
                  key={photo.id}
                  uri={photo.uri}
                  style={styles.photo}
                  recyclingKey={photo.id}
                />
              ))}
            </View>
          </View>
        )}

        <Section title="Her terms" footer="You'll be asked to accept these when you book.">
          <ListRow
            title={`${profile.policies.noticeHours} hours' notice to cancel`}
            subtitle="Cancel inside that window and it counts against you"
            icon={Clock}
            iconTone="neutral"
          />
          <ListRow
            title={deposit}
            subtitle="Paid straight to her — Yasante never handles it"
            icon={Store}
            iconTone="neutral"
          />
        </Section>
      </View>
    </Screen>
  );
}
