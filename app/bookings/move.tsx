import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { addDays, setHours, startOfHour } from 'date-fns';
import { CalendarSync } from 'lucide-react-native';
import { errorMessage, useAuth } from '@/features/auth';
import { inSentence, useBooking, useRequestMove, whenLabel } from '@/features/booking';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { notify } from '@/shared/ui/dialog';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  group: { gap: space.sm },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/**
 * Asking to move an appointment. Either side can, once: the deposit and history
 * carry over. The other side has to agree, because it's their day too.
 */
export default function MoveBookingScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBooking(id);
  const requestMove = useRequestMove();
  const [when, setWhen] = useState(() => setHours(startOfHour(addDays(new Date(), 2)), 10));

  if (isLoading || !booking) {
    return (
      <Screen title="Move it" modal testID="move-booking">
        <Skeleton height={200} />
      </Screen>
    );
  }

  const asStylist = booking.stylistId === user?.id;
  const other = asStylist ? booking.clientName.split(' ')[0] : booking.stylistName;

  const send = async () => {
    try {
      await requestMove.mutateAsync({ id, scheduledFor: when.toISOString() });
      haptics.success();
      router.back();
      await notify({
        title: 'Sent',
        message: `${other} has been asked. Until they agree, it stays at ${inSentence(whenLabel(booking.scheduledFor ?? ''))}.`,
      });
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t ask',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title="Move it" modal testID="move-booking">
      <View style={styles.body}>
        <Text variant="body" tone="secondary">
          It’s at {inSentence(whenLabel(booking.scheduledFor ?? ''))} now. Pick the new time and{' '}
          {other} will be asked to agree.
        </Text>
        <View style={styles.group}>
          <DateTimeField
            title="Day"
            mode="date"
            value={when}
            onChange={setWhen}
            minimumDate={new Date()}
          />
          <DateTimeField title="Start at" mode="time" value={when} onChange={setWhen} />
        </View>
        <InlineAlert
          tone="info"
          message="One move is free and keeps the deposit and the history. After that, changing it means cancelling and booking again."
        />
        <View style={styles.footer}>
          <Button
            label="Ask to move it"
            icon={CalendarSync}
            onPress={send}
            loading={requestMove.isPending}
            fullWidth
            testID="move-send"
          />
          <Button
            label="Keep it as it is"
            variant="ghost"
            onPress={() => router.back()}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}
