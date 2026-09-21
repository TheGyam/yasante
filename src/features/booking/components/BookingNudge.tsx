import { View } from 'react-native';
import { ChevronRight, MessageSquareHeart, Sparkles } from 'lucide-react-native';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Rise } from '@/shared/ui/Rise';
import { Text } from '@/shared/ui/Text';
import { useBookings } from '../hooks';

const useStyles = makeStyles(t => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  well: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  text: { flex: 1, gap: 2 },
}));

/**
 * The one thing a finished appointment is still waiting on her for: a check-in
 * when one is open, otherwise a review. Nothing at all when there's neither.
 */
export function BookingNudge() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { data: bookings = [] } = useBookings('client', ['completed']);

  const checkIn = bookings.find(b => b.checkInDue);
  const unreviewed = bookings.find(b => !b.review);
  if (!checkIn && !unreviewed) return null;

  const nudge = checkIn
    ? {
        icon: Sparkles,
        title: `How are your ${checkIn.serviceName.toLowerCase()} holding up?`,
        subtitle: `Week ${checkIn.checkInDue} · three taps`,
        href: `/check-in/${checkIn.id}`,
      }
    : {
        icon: MessageSquareHeart,
        title: `How was ${unreviewed!.stylistName}?`,
        subtitle: 'A review helps the next person choose',
        href: `/review/${unreviewed!.id}`,
      };
  const Icon = nudge.icon;

  return (
    <Rise>
      <Card
        onPress={() => router.push(nudge.href)}
        accessibilityLabel={`${nudge.title} ${nudge.subtitle}`}
        testID="booking-nudge"
      >
        <View style={styles.row}>
          <View style={styles.well}>
            <Icon size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.text}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {nudge.title}
            </Text>
            <Text variant="footnote" tone="secondary">
              {nudge.subtitle}
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.text.tertiary} />
        </View>
      </Card>
    </Rise>
  );
}
