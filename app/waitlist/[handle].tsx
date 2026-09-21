import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { BellRing } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import { useWatchSlots } from '@/features/booking';
import { useStylistPage } from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { DateTimeField } from '@/shared/ui/DateTimeField';
import { notify } from '@/shared/ui/dialog';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  group: { gap: space.sm },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/**
 * Waiting for a slot. When someone cancels or a request lapses on a day she could
 * do, she's told first — which is how a cancellation gets refilled instead of
 * left empty.
 */
export default function WaitlistScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { data } = useStylistPage(handle);
  const watch = useWatchSlots();
  const [from, setFrom] = useState(() => startOfDay(addDays(new Date(), 1)));
  const [to, setTo] = useState(() => startOfDay(addDays(new Date(), 14)));

  if (!data) {
    return (
      <Screen title="Wait for a slot" modal testID="waitlist">
        <Skeleton height={200} />
      </Screen>
    );
  }

  const save = async () => {
    try {
      await watch.mutateAsync({
        stylistId: data.profile.accountId,
        from: startOfDay(from).toISOString(),
        to: endOfDay(to < from ? from : to).toISOString(),
      });
      haptics.success();
      router.back();
      await notify({
        title: 'You’re on the list',
        message: `If a slot opens with ${data.profile.displayName} on one of those days, you’ll hear first. It’s in your bookings.`,
      });
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t add you',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title="Wait for a slot" modal testID="waitlist">
      <View style={styles.body}>
        <Text variant="body" tone="secondary">
          Which days could you do? When someone cancels on one of them, you’ll be told straight
          away.
        </Text>
        <View style={styles.group}>
          <DateTimeField
            title="From"
            mode="date"
            value={from}
            onChange={setFrom}
            minimumDate={new Date()}
          />
          <DateTimeField title="To" mode="date" value={to} onChange={setTo} minimumDate={from} />
        </View>
        <View style={styles.footer}>
          <Button
            label="Tell me if one opens"
            icon={BellRing}
            onPress={save}
            loading={watch.isPending}
            fullWidth
            testID="waitlist-save"
          />
        </View>
      </View>
    </Screen>
  );
}
