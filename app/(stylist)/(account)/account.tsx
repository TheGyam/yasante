import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { BadgeCheck, MapPin, Settings, Store, WifiOff } from 'lucide-react-native';
import {
  ModeSwitchRow,
  PageLinkCard,
  VERIFICATION_LABELS,
  isNotFound,
  useMyStylistProfile,
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
    <Screen tabBar testID="stylist-account">
      <View style={styles.body}>
        {isLoading ? (
          <Skeleton height={160} />
        ) : isNotFound(error) ? (
          <EmptyState
            icon={Store}
            title="Your page isn’t set up yet"
            message="Add your styles, prices and policies, and you’ll get a link for your bio."
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
            </Section>
            <PageLinkCard profile={profile} />
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
