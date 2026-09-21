import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Check, MessageSquareHeart } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import { useBooking, useLeaveReview } from '@/features/booking';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StarRating } from '@/shared/ui/StarRating';
import { Text } from '@/shared/ui/Text';

const WORDS = ['', 'Not for me', 'Could have been better', 'Good', 'Really good', 'Loved it'];

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  head: { gap: space.xs },
  stars: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  tick: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.successSoft,
  },
}));

/**
 * A review, from a completed booking only. It's checked before it appears, and
 * she's told that plainly rather than shown it going live.
 */
export default function ReviewScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(id);
  const leave = useLeaveReview();

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');

  const send = async () => {
    try {
      await leave.mutateAsync({ id, rating, body: body.trim() || undefined });
      haptics.success();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t send your review',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  if (isLoading) {
    return (
      <Screen modal testID="review-screen">
        <Skeleton height={240} />
      </Screen>
    );
  }

  if (leave.isSuccess) {
    return (
      <Screen modal scroll={false} testID="review-screen">
        <View style={styles.done}>
          <Animated.View entering={ZoomIn.duration(320).easing(EASE_OUT)} style={styles.tick}>
            <Check size={34} color={theme.colors.success} strokeWidth={2.6} />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(120).duration(240)}>
            <Text variant="title2" align="center" accessibilityRole="header">
              Thank you
            </Text>
            <Text variant="body" tone="secondary" align="center" style={{ marginTop: space.xs }}>
              Every review is checked before it appears on {booking?.stylistName ?? 'her'}’s page.
            </Text>
          </Animated.View>
        </View>
        <Button label="Done" onPress={() => router.back()} fullWidth testID="review-done" />
      </Screen>
    );
  }

  if (!booking || booking.status !== 'completed' || booking.review) {
    return (
      <Screen modal scroll={false} testID="review-screen">
        <EmptyState
          icon={MessageSquareHeart}
          title={booking?.review ? 'Already reviewed' : 'Not yet'}
          message={
            booking?.review
              ? 'You’ve left a review for this appointment.'
              : 'Reviews open once the appointment is done.'
          }
          actionLabel="Close"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen modal keyboard title="Review" testID="review-screen">
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="title1" accessibilityRole="header">
            How was {booking.stylistName}?
          </Text>
          <Text variant="subhead" tone="secondary">
            {booking.serviceName}
          </Text>
        </View>

        <View style={styles.stars}>
          <StarRating value={rating} onChange={setRating} size={40} testID="review-stars" />
          <Text variant="callout" tone={rating ? 'primary' : 'tertiary'}>
            {WORDS[rating] || 'Tap to rate'}
          </Text>
        </View>

        <Input
          label="Tell the next person (optional)"
          value={body}
          onChangeText={setBody}
          placeholder="Was it neat? On time? Gentle on your edges?"
          multiline
          maxLength={1000}
          style={{ minHeight: 110 }}
        />

        <View>
          <Button
            label="Send review"
            onPress={send}
            disabled={!rating}
            loading={leave.isPending}
            fullWidth
            testID="review-send"
          />
          <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: space.sm }}>
            Your first name and the style appear with it. Checked before it goes up.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
