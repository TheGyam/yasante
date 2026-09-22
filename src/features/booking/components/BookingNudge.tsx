import { View } from 'react-native';
import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  MessageSquareHeart,
  type LucideIcon,
  Activity,
} from 'lucide-react-native';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Rise } from '@/shared/ui/Rise';
import { Text } from '@/shared/ui/Text';
import { dayLabel, inSentence, needsAttendance, whenLabel } from '../format';
import { useBookings, useSlotInterests } from '../hooks';
import type { Booking, SlotInterest } from '../types';

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

interface Nudge {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href: string;
}

/**
 * The most pressing thing, and only one: time-bound answers first (is she still
 * coming, does the suggested time work, a slot that just opened), then the gentle
 * ones (a check-in, a review).
 */
function pickNudge(bookings: Booking[], waiting: SlotInterest[]): Nudge | undefined {
  const coming = bookings.find(b => needsAttendance(b));
  if (coming) {
    return {
      icon: CalendarCheck,
      title: `Still coming to ${coming.stylistName} ${dayLabel(coming.scheduledFor!).toLowerCase()}?`,
      subtitle: 'One tap lets her plan',
      href: `/bookings/${coming.id}`,
    };
  }
  const suggested = bookings.find(b => b.status === 'requested' && b.proposal);
  if (suggested) {
    return {
      icon: CalendarClock,
      title: `${suggested.stylistName} suggested ${inSentence(whenLabel(suggested.proposal!.scheduledFor))}`,
      subtitle: 'Does it work for you?',
      href: `/bookings/${suggested.id}`,
    };
  }
  const opened = waiting.find(w => w.openedOn);
  if (opened) {
    return {
      icon: BellRing,
      title: `A slot opened with ${opened.stylistName}`,
      subtitle: `${dayLabel(opened.openedOn!)} — ask before someone else does`,
      href: `/book/${opened.stylistHandle}?date=${opened.openedOn}`,
    };
  }
  const done = bookings.filter(b => b.status === 'completed');
  const checkIn = done.find(b => b.checkInDue);
  if (checkIn) {
    return {
      icon: Activity,
      title: `How are your ${checkIn.serviceName.toLowerCase()} holding up?`,
      subtitle: `Week ${checkIn.checkInDue} · three taps`,
      href: `/check-in/${checkIn.id}`,
    };
  }
  const unreviewed = done.find(b => !b.review);
  if (unreviewed) {
    return {
      icon: MessageSquareHeart,
      title: `How was ${unreviewed.stylistName}?`,
      subtitle: 'A review helps the next person choose',
      href: `/review/${unreviewed.id}`,
    };
  }
  return undefined;
}

/**
 * The one thing her bookings are waiting on her for, on the home screen. Nothing
 * at all when there's nothing to do.
 */
export function BookingNudge() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { data: bookings = [] } = useBookings('client');
  const { data: waiting = [] } = useSlotInterests();
  const nudge = pickNudge(bookings, waiting);
  if (!nudge) return null;
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
