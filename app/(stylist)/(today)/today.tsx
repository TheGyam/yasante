import { View } from 'react-native';
import { format } from 'date-fns';
import { CalendarClock, Store } from 'lucide-react-native';
import { PageLinkCard, isNotFound, useMyStylistProfile } from '@/features/stylist';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

export default function TodayScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data: profile, isLoading, error, refetch, isRefetching } = useMyStylistProfile();

  return (
    <Screen
      title="Today"
      subtitle={format(new Date(), 'EEEE d MMMM')}
      refreshing={isRefetching}
      onRefresh={refetch}
      testID="stylist-today"
    >
      <View style={styles.body}>
        {isLoading ? (
          <Skeleton height={180} />
        ) : isNotFound(error) ? (
          <EmptyState
            icon={Store}
            title="Set up your page"
            message="Your styles, prices and policies on one link for your bio. About twenty minutes."
            actionLabel="Set up my page"
            onAction={() => router.push('/stylist-setup')}
          />
        ) : profile && !profile.published ? (
          <Section footer="Only you can see it until it’s live.">
            <ListRow
              title="Your page is still a draft"
              subtitle="Finish setting it up to go live"
              icon={Store}
              onPress={() => router.push('/stylist-setup')}
            />
          </Section>
        ) : (
          profile && <PageLinkCard profile={profile} />
        )}
        <View>
          <SectionHeader title="Appointments" />
          <EmptyState
            icon={CalendarClock}
            title="Nothing booked today"
            message="Confirmed bookings show up here with the time, where, and what the client is bringing."
          />
        </View>
      </View>
    </Screen>
  );
}
