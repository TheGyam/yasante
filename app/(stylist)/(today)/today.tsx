import { View } from 'react-native';
import { format } from 'date-fns';
import { CalendarClock } from 'lucide-react-native';
import { PageLinkCard, useMyStylistProfile } from '@/features/stylist';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Screen } from '@/shared/ui/Screen';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

export default function TodayScreen() {
  const styles = useStyles();
  const { data: profile, isLoading, refetch, isRefetching } = useMyStylistProfile();

  return (
    <Screen
      title="Today"
      subtitle={format(new Date(), 'EEEE d MMMM')}
      tabBar
      refreshing={isRefetching}
      onRefresh={refetch}
      testID="stylist-today"
    >
      <View style={styles.body}>
        {isLoading ? <Skeleton height={180} /> : profile && <PageLinkCard profile={profile} />}
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
