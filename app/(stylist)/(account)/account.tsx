import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import {
  BadgeCheck,
  BarChart3,
  Clock,
  MapPin,
  Pencil,
  Settings,
  Store,
  WifiOff,
  Wallet,
} from 'lucide-react-native';
import {
  ModeSwitchRow,
  PageLinkCard,
  VERIFICATION_LABELS,
  isNotFound,
  useMyStylistProfile,
  hoursLabel,
} from '@/features/stylist';
import { makeStyles, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  identity: { alignItems: 'center', gap: space.sm },
  names: { alignItems: 'center', gap: 2 },
}));

export default function StylistAccountScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data: profile, isLoading, isError, error, refetch } = useMyStylistProfile();

  return (
    <Screen testID="stylist-account">
      <View style={styles.body}>
        {isLoading ? (
          <Skeleton height={160} />
        ) : isNotFound(error) ? (
          <EmptyState
            icon={Store}
            title="Your page isn’t set up yet"
            message="Add your styles, prices and policies, and you’ll get a link for your bio."
            actionLabel="Set up my page"
            onAction={() => router.push('/stylist-setup')}
          />
        ) : isError || !profile ? (
          <EmptyState
            icon={WifiOff}
            title="Couldn’t load your page"
            message="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => refetch()}
          />
        ) : (
          <>
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
            </View>
            <Section>
              <ListRow
                title={profile.baseArea}
                subtitle="Shown as a district only"
                icon={MapPin}
                iconTone="neutral"
              />
              <ListRow
                title={VERIFICATION_LABELS[profile.verificationTier]}
                icon={BadgeCheck}
                iconTone={profile.verificationTier > 0 ? 'success' : 'neutral'}
              />
              {profile.published && (
                <ListRow
                  title="Edit your page"
                  subtitle="Name, photo, bio, area and your terms"
                  icon={Pencil}
                  onPress={() => router.push('/stylist-setup')}
                  testID="account-edit-page"
                />
              )}
            </Section>
            <Section>
              <ListRow
                title="Working hours"
                subtitle={
                  hoursLabel(profile.availability) ?? 'Not set — clients see every day, 9 to 6'
                }
                icon={Clock}
                iconTone={profile.availability ? 'accent' : 'gold'}
                onPress={() => router.push('/availability')}
                testID="account-hours"
              />
              <ListRow
                title="Getting paid"
                subtitle={
                  profile.paymentMethods?.length
                    ? profile.paymentMethods.map(m => m.label).join(', ')
                    : 'Save your details once, pick them when you accept'
                }
                icon={Wallet}
                iconTone={profile.paymentMethods?.length ? 'accent' : 'gold'}
                onPress={() => router.push('/payment-methods')}
                testID="account-payment"
              />
              <ListRow
                title="Your numbers"
                subtitle="This week, and how your services really run"
                icon={BarChart3}
                onPress={() => router.push('/numbers')}
                testID="account-numbers"
              />
            </Section>
            {profile.published ? (
              <PageLinkCard profile={profile} />
            ) : (
              <Section footer="Only you can see it until it's live.">
                <ListRow
                  title="Your page is still a draft"
                  subtitle="Finish setting it up to go live"
                  icon={Store}
                  onPress={() => router.push('/stylist-setup')}
                />
              </Section>
            )}
          </>
        )}

        <Section>
          <ModeSwitchRow />
          <ListRow
            title="Settings"
            icon={Settings}
            iconTone="neutral"
            onPress={() => router.push('/settings')}
          />
        </Section>
      </View>
    </Screen>
  );
}
