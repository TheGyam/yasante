import { RefreshControl, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Package, Plus, RotateCcw } from 'lucide-react-native';
import { CATEGORY_LABELS, isInUse, shelfSummary, useShelf, type ShelfItem } from '@/features/shelf';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, space, useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { useContentInsets } from '@/shared/ui/layout';
import { Screen, ScreenTitle, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StarRating } from '@/shared/ui/StarRating';
import { Text } from '@/shared/ui/Text';

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

type Row = { type: 'heading'; title: string } | { type: 'item'; item: ShelfItem };

const useStyles = makeStyles(() => ({
  header: { gap: space.xs, marginBottom: space.lg },
  heading: { paddingTop: space.lg, paddingBottom: space.sm, paddingHorizontal: space.xs },
  cell: { paddingBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 },
  again: { flexDirection: 'row', alignItems: 'center', gap: 3 },
}));

/** The products she uses, rated, and what she's been through. */
export default function ShelfScreen() {
  const router = useRouter();
  return (
    <Screen
      title="Your shelf"
      back
      scroll="list"
      headerRight={
        <IconButton
          icon={Plus}
          size={36}
          accessibilityLabel="Add a product"
          onPress={() => router.push('/shelf/add')}
          testID="shelf-add"
        />
      }
      testID="shelf-screen"
    >
      <Shelf />
    </Screen>
  );
}

function Shelf() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();
  const { data: items = [], isLoading, isRefetching, refetch } = useShelf();

  const using = items.filter(isInUse);
  const finished = items.filter(item => !isInUse(item));
  const rows: Row[] = [
    ...(using.length ? [{ type: 'heading' as const, title: 'Using now' }] : []),
    ...using.map(item => ({ type: 'item' as const, item })),
    ...(finished.length ? [{ type: 'heading' as const, title: 'Finished' }] : []),
    ...finished.map(item => ({ type: 'item' as const, item })),
  ];

  return (
    <AnimatedFlashList
      data={rows}
      keyExtractor={row => (row.type === 'heading' ? row.title : row.item.id)}
      getItemType={row => row.type}
      renderItem={({ item: row }) =>
        row.type === 'heading' ? (
          <Text variant="overline" tone="tertiary" style={styles.heading}>
            {row.title}
          </Text>
        ) : (
          <View style={styles.cell}>
            <Card
              onPress={() => router.push(`/shelf/${row.item.id}`)}
              accessibilityLabel={`${row.item.product.brand} ${row.item.product.name}`}
              testID={`shelf-item-${row.item.id}`}
            >
              <View style={styles.row}>
                <View style={styles.text}>
                  <Text variant="caption" tone="tertiary">
                    {row.item.product.brand}
                  </Text>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {row.item.product.name}
                  </Text>
                  <View style={styles.meta}>
                    {row.item.rating ? (
                      <StarRating value={row.item.rating} size={12} />
                    ) : (
                      <Text variant="caption" tone="accent">
                        Rate it
                      </Text>
                    )}
                    <Text variant="caption" tone="tertiary">
                      {CATEGORY_LABELS[row.item.product.category]}
                    </Text>
                    {row.item.timesBought > 1 && (
                      <View style={styles.again}>
                        <RotateCcw size={11} color={theme.colors.success} strokeWidth={2.4} />
                        <Text variant="caption" tone="success">
                          Bought {row.item.timesBought}×
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Card>
          </View>
        )
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <ScreenTitle title="Your shelf" />
          {!!items.length && (
            <Text variant="subhead" tone="secondary">
              {shelfSummary(items)}
            </Text>
          )}
          {isLoading && <Skeleton height={160} />}
        </View>
      }
      ListEmptyComponent={
        isLoading ? null : (
          <EmptyState
            icon={Package}
            title="Nothing on your shelf yet"
            message="Add what you use. Rate it once you know, and mark it when it runs out — what you buy again says the most."
            actionLabel="Add a product"
            onAction={() => router.push('/shelf/add')}
          />
        )
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={theme.colors.accent}
          colors={[theme.colors.accent]}
          progressViewOffset={insets.top}
        />
      }
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingHorizontal: GUTTER,
      }}
    />
  );
}
