import { View } from 'react-native';
import { format, isToday } from 'date-fns';
import { CalendarClock, ClipboardCheck, Store, UserCheck } from 'lucide-react-native';
import { useBookings, whenLabel, type Booking } from '@/features/booking';
import {
  PageLinkCard,
  isNotFound,
  useMyStylistProfile,
  useStylistNumbers,
} from '@/features/stylist';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

/** Where she's up to with the client: closing out, confirmed, or still waiting on a yes. */
function attendance(booking: Booking) {
  const first = booking.clientName.split(' ')[0];
  if (booking.scheduledFor && new Date(booking.scheduledFor) <= new Date()) {
    return { text: 'Close it out when they leave', icon: ClipboardCheck, tone: 'accent' as const };
  }
  return booking.attendanceConfirmedAt
    ? { text: `${first} said she’s coming`, icon: UserCheck, tone: 'success' as const }
    : { text: 'Not confirmed yet', icon: CalendarClock, tone: 'neutral' as const };
}

export default function TodayScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data: profile, isLoading, error, refetch, isRefetching } = useMyStylistProfile();
  const { data: confirmed = [] } = useBookings('stylist', ['confirmed']);
  const { data: numbers } = useStylistNumbers();

  // Today, plus anything from before that still hasn't been closed out.
  const due = (booking: Booking) =>
    !!booking.scheduledFor &&
    (isToday(new Date(booking.scheduledFor)) || new Date(booking.scheduledFor) < new Date());
  const today = confirmed.filter(due);
  const later = confirmed.filter(booking => booking.scheduledFor && !due(booking));

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

        {!!numbers && (
          <Card onPress={() => router.push('/numbers')} accessibilityLabel="Your week">
            <Text variant="overline" tone="tertiary">
              This week
            </Text>
            <Text variant="bodyStrong" style={{ marginTop: space.xs }}>
              {numbers.thisWeek.requests} {numbers.thisWeek.requests === 1 ? 'request' : 'requests'}{' '}
              · {numbers.thisWeek.confirmed} confirmed · {numbers.thisWeek.views} page views
            </Text>
            <Text variant="footnote" tone="accent" style={{ marginTop: space.xs }}>
              See your numbers
            </Text>
          </Card>
        )}

        <View>
          <SectionHeader title="Appointments" />
          {today.length ? (
            <Section footer="Close one out when your client leaves — it's what keeps your numbers honest.">
              {today.map(booking => {
                const state = attendance(booking);
                return (
                  <ListRow
                    key={booking.id}
                    title={`${booking.clientName} · ${booking.serviceName}`}
                    subtitle={`${whenLabel(booking.scheduledFor!)} · ${state.text}`}
                    icon={state.icon}
                    iconTone={state.tone}
                    onPress={() => router.push(`/requests/${booking.id}`)}
                    testID={`today-${booking.id}`}
                  />
                );
              })}
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
                subtitle={`${whenLabel(booking.scheduledFor!)} · ${attendance(booking).text}`}
                icon={CalendarClock}
                onPress={() => router.push(`/requests/${booking.id}`)}
              />
            ))}
          </Section>
        )}
      </View>
    </Screen>
  );
}
