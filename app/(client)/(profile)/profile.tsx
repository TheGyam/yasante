import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import {
  Bookmark,
  CalendarClock,
  ChartNoAxesColumn,
  Droplets,
  Images,
  LayoutGrid,
  Package,
  Settings,
  UserRound,
} from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { isLive, useBookings } from '@/features/booking';
import { useCollections } from '@/features/planner';
import {
  hairTraits,
  insightsHeadline,
  lengthIsStale,
  progressOf,
  useInsights,
  useUser,
  useUserStore,
} from '@/features/profile';
import { shelfSummary, useShelf } from '@/features/shelf';
import { ModeSwitchRow, useIsStylist } from '@/features/stylist';
import { AtSign, Scissors } from 'lucide-react-native';
import { Rise } from '@/shared/ui/Rise';
import { makeStyles, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { SEP } from '@/shared/lib/format';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  identity: { alignItems: 'center', gap: space.sm },
  names: { alignItems: 'center', gap: 2, marginBottom: space.xs },
  hair: { gap: space.md },
  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const settings = (
    <IconButton
      icon={Settings}
      size={36}
      accessibilityLabel="Settings"
      onPress={() => router.push('/settings')}
    />
  );

  return (
    <Screen headerRight={settings} testID="profile-screen">
      {isAuthenticated ? (
        <Profile />
      ) : (
        <EmptyState
          icon={UserRound}
          title="Your hair, your space"
          message="Create a free account to keep your collections, saved styles and hair profile in one place."
          actionLabel="Create a free account"
          onAction={() => router.push('/auth/join')}
        />
      )}
    </Screen>
  );
}

function Profile() {
  const styles = useStyles();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const isStylist = useIsStylist();
  const { data: user } = useUser(authUser?.id);
  // The quiz can be taken before signing up, so fall back to this device's answers.
  const localHair = useUserStore(s => s.hairProfile);
  const hair = { ...localHair, ...user?.hairProfile };
  const traits = hairTraits(hair);
  const progress = progressOf(hair);
  const stale = lengthIsStale(hair);
  const collections = useCollections();
  const { data: bookings = [] } = useBookings('client');
  const shelf = useShelf();
  const live = bookings.filter(isLive);
  const { data: insights } = useInsights('month');
  const name = user?.name ?? authUser?.name;

  return (
    <View style={styles.body}>
      <View style={styles.identity}>
        <Avatar uri={user?.avatarUri} name={name} size={88} />
        <View style={styles.names}>
          <Text variant="title1" accessibilityRole="header">
            {name ?? ' '}
          </Text>
          {user?.username ? (
            <Text variant="subhead" tone="accent">
              @{user.username}
            </Text>
          ) : (
            !!user?.email && (
              <Text variant="subhead" tone="secondary">
                {user.email}
              </Text>
            )
          )}
        </View>
        <Button
          label="Edit profile"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/edit-profile')}
        />
      </View>

      {/* Posts show a username (or just her first name until she picks one). */}
      {!!user && !user.username && !isStylist && (
        <Rise>
          <Section>
            <ListRow
              title="Pick a username"
              subtitle="It’s what your looks and comments show, instead of your name"
              icon={AtSign}
              iconTone="accent"
              onPress={() => router.push('/edit-profile')}
              testID="pick-username"
            />
          </Section>
        </Rise>
      )}

      <Section>
        {isStylist ? (
          <ModeSwitchRow />
        ) : (
          <ListRow
            title="Set up your stylist profile"
            subtitle="A page for your bio, free for founding stylists"
            icon={Scissors}
            onPress={() => router.push('/stylist-setup')}
          />
        )}
      </Section>

      <Card onPress={() => router.push('/hair-profile')} accessibilityLabel="Hair profile">
        <View style={styles.hair}>
          <Text variant="overline" tone="tertiary">
            Your hair
          </Text>
          {traits.length ? (
            <View style={styles.traits}>
              {traits.map(trait => (
                <Chip key={trait} label={trait} />
              ))}
            </View>
          ) : (
            <Text variant="body" tone="secondary">
              Take the two-minute quiz and we’ll match care and styles to your texture.
            </Text>
          )}
          <Text variant="callout" tone="accent">
            {!traits.length
              ? 'Find your hair type'
              : stale
                ? 'It’s been a month — has it grown?'
                : progress.next
                  ? `${progress.done} of ${progress.total} answered${SEP}add ${progress.next.name.toLowerCase()}`
                  : 'See your hair profile'}
          </Text>
        </View>
      </Card>

      <Section>
        <ListRow
          title="Your bookings"
          subtitle={
            live.length ? `${live.length} coming up` : 'Requests, deposits and confirmed dates'
          }
          icon={CalendarClock}
          iconTone={live.length ? 'success' : 'accent'}
          onPress={() => router.push('/bookings')}
          testID="profile-bookings"
        />
        <ListRow
          title="Your hair this month"
          subtitle={insightsHeadline(insights)}
          icon={ChartNoAxesColumn}
          onPress={() => router.push('/insights')}
          testID="profile-insights"
        />
        <ListRow
          title="Your collections"
          subtitle={
            collections.data?.length
              ? `${collections.data.length} ${collections.data.length === 1 ? 'collection' : 'collections'}`
              : 'Nothing saved yet'
          }
          icon={LayoutGrid}
          onPress={() => router.navigate('/planner')}
          testID="profile-collections"
        />
        <ListRow
          title="Your looks"
          subtitle="What you’ve posted, and the ones kept for yourself"
          icon={Images}
          onPress={() => router.push('/looks/mine')}
          testID="profile-looks"
        />
        <ListRow
          title="Your product shelf"
          subtitle={
            shelf.data?.length ? shelfSummary(shelf.data) : 'What you use, and how it works'
          }
          icon={Package}
          onPress={() => router.push('/shelf')}
          testID="profile-shelf"
        />
        <ListRow title="Saved articles" icon={Bookmark} onPress={() => router.push('/saved')} />
        <ListRow
          title="Hair care library"
          icon={Droplets}
          iconTone="success"
          onPress={() => router.push('/learn')}
        />
      </Section>
    </View>
  );
}
