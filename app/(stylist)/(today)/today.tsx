import { View } from 'react-native';
import { format, isToday } from 'date-fns';
import { CalendarClock, Check, Store, UserX } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import { recordLabel, useBookings, useCloseBooking, whenLabel } from '@/features/booking';
import { PageLinkCard, isNotFound, useMyStylistProfile } from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  actions: { gap: space.xs, marginTop: space.sm },
}));

export default function TodayScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data: profile, isLoading, error, refetch, isRefetching } = useMyStylistProfile();
  const { data: confirmed = [] } = useBookings('stylist', ['confirmed']);
  const close = useCloseBooking();

  const today = confirmed.filter(
    booking => booking.scheduledFor && isToday(new Date(booking.scheduledFor))
  );
  const later = confirmed.filter(
    booking => booking.scheduledFor && !isToday(new Date(booking.scheduledFor))
  );

  const closeOut = async (id: string, name: string) => {
    const attended = await confirm({
      title: `Did ${name} come?`,
      message: 'A no-show can be contested, so only mark one if she really didn’t arrive.',
      confirmLabel: 'She came',
      cancelLabel: 'She didn’t',
    });
    try {
      await close.mutateAsync({ id, outcome: attended ? 'attended' : 'no_show' });
      haptics.success();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t close it',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

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
          {today.length ? (
            <Section footer="Close one out when she leaves — it's what keeps your numbers honest.">
              {today.map(booking => (
                <ListRow
                  key={booking.id}
                  title={`${booking.clientName} · ${booking.serviceName}`}
                  subtitle={`${whenLabel(booking.scheduledFor!)} · ${recordLabel(booking.clientRecord) ?? ''}`}
                  icon={CalendarClock}
                  iconTone="success"
                  onPress={() => closeOut(booking.id, booking.clientName)}
                  testID={`today-${booking.id}`}
                />
              ))}
            </Section>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="Nothing booked today"
              message="Confirmed bookings show up here with the time, where, and what the client is bringing."
            />
          )}
        </View>

        {later.length > 0 && (
          <Section title="Coming up">
            {later.map(booking => (
              <ListRow
                key={booking.id}
                title={`${booking.clientName} · ${booking.serviceName}`}
                subtitle={whenLabel(booking.scheduledFor!)}
                icon={CalendarClock}
              />
            ))}
          </Section>
        )}
      </View>
    </Screen>
  );
}
