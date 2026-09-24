import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { CalendarCheck, CalendarPlus, PackageCheck, RotateCcw, Trash2 } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  CATEGORY_LABELS,
  isInUse,
  useRemoveFromShelf,
  useShelf,
  useUpdateShelfItem,
} from '@/features/shelf';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { confirm, notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StarRating } from '@/shared/ui/StarRating';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  head: { gap: space.xs },
  rate: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
}));

const day = (iso: string) => format(new Date(iso), 'd MMM yyyy');

/** One product on her shelf: how she rates it, and where it's up to. */
export default function ShelfItemScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: shelf, isLoading } = useShelf();
  const item = shelf?.find(i => i.id === id);
  const update = useUpdateShelfItem();
  const remove = useRemoveFromShelf();

  // The stars answer the tap straight away; the server catches up behind them.
  const [rating, setRating] = useState(0);
  useEffect(() => {
    if (item?.rating) setRating(item.rating);
  }, [item?.rating]);

  const fail = async (error: unknown, title: string) => {
    haptics.error();
    await notify({ title, message: errorMessage(error, 'Check your connection and try again.') });
  };

  const rate = async (next: number) => {
    const before = rating;
    setRating(next);
    try {
      await update.mutateAsync({ id, rating: next });
    } catch (error) {
      setRating(before);
      await fail(error, 'Couldn’t save your rating');
    }
  };

  const move = async (status: 'finished' | 'repurchased') => {
    try {
      await update.mutateAsync({ id, status });
      haptics.success();
    } catch (error) {
      await fail(error, 'Couldn’t update it');
    }
  };

  const confirmRemove = async () => {
    const yes = await confirm({
      title: 'Take it off your shelf?',
      message: 'Its rating goes with it.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!yes) return;
    try {
      await remove.mutateAsync(id);
      haptics.success();
      router.back();
    } catch (error) {
      await fail(error, 'Couldn’t remove it');
    }
  };

  if (isLoading) {
    return (
      <Screen back testID="shelf-item-screen">
        <Skeleton height={240} />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen back testID="shelf-item-screen">
        <EmptyState
          icon={PackageCheck}
          title="Not on your shelf"
          message="It may have been removed."
        />
      </Screen>
    );
  }

  const inUse = isInUse(item);

  return (
    // The name is in the page's own heading; the bar shows it once scrolled past.
    <Screen back title={item.product.name} titleBlock={false} testID="shelf-item-screen">
      <View style={styles.body}>
        <View style={styles.head}>
          <Text variant="overline" tone="tertiary">
            {item.product.brand} · {CATEGORY_LABELS[item.product.category]}
          </Text>
          <Text variant="title1" accessibilityRole="header">
            {item.product.name}
          </Text>
        </View>

        <View style={styles.rate}>
          <StarRating value={rating} onChange={rate} size={36} testID="shelf-rating" />
          <Text variant="footnote" tone="tertiary" align="center">
            {rating
              ? 'Your rating is read alongside your hair profile, so it helps people with hair like yours.'
              : 'How is it working for your hair?'}
          </Text>
        </View>

        <Section>
          <ListRow
            title="Started"
            value={day(item.startedAt)}
            icon={CalendarPlus}
            iconTone="neutral"
          />
          {!!item.finishedAt && (
            <ListRow
              title="Finished"
              value={day(item.finishedAt)}
              icon={CalendarCheck}
              iconTone="neutral"
            />
          )}
          {item.timesBought > 1 && (
            <ListRow
              title={`Bought ${item.timesBought} times`}
              icon={RotateCcw}
              iconTone="success"
            />
          )}
        </Section>

        <Section
          footer={
            inUse
              ? 'Mark it when it runs out. Buying it again is the best review a product can get.'
              : undefined
          }
        >
          {inUse ? (
            <ListRow
              title="I’ve finished it"
              icon={PackageCheck}
              onPress={() => move('finished')}
              testID="shelf-finish"
            />
          ) : (
            <ListRow
              title="I bought it again"
              icon={RotateCcw}
              iconTone="success"
              onPress={() => move('repurchased')}
              testID="shelf-repurchase"
            />
          )}
          <ListRow title="Take it off my shelf" icon={Trash2} destructive onPress={confirmRemove} />
        </Section>
      </View>
    </Screen>
  );
}
