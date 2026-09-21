import { useState } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Check, Plus, SearchX } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  CATEGORY_LABELS,
  useAddToShelf,
  useProductSearch,
  useShelf,
  type Product,
} from '@/features/shelf';
import { haptics } from '@/shared/lib/haptics';
import { GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Screen } from '@/shared/ui/Screen';
import { SearchField } from '@/shared/ui/SearchField';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(t => ({
  search: { paddingHorizontal: GUTTER, paddingBottom: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.glass.border,
  },
  text: { flex: 1, gap: 2 },
  mark: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: { backgroundColor: t.colors.accentSoft },
  added: { backgroundColor: t.colors.success },
}));

/** Search the catalogue and tap what you use. Stays open, so a few can go on at once. */
export default function AddToShelfScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const { data: results = [], isLoading } = useProductSearch(q);
  const { data: shelf = [] } = useShelf();
  const add = useAddToShelf();
  // Ticked the moment she taps, rather than when the shelf re-reads.
  const [added, setAdded] = useState<Set<string>>(new Set());

  const onShelf = (product: Product) =>
    added.has(product.id) || shelf.some(item => item.product.id === product.id);

  const pick = async (product: Product) => {
    if (onShelf(product)) return;
    setAdded(prev => new Set(prev).add(product.id));
    try {
      await add.mutateAsync(product.id);
    } catch (error) {
      haptics.error();
      setAdded(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      await notify({
        title: 'Couldn’t add it',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title="Add to your shelf" modal scroll={false} padded={false} testID="shelf-add-screen">
      <View style={styles.search}>
        <SearchField
          placeholder="Brand or product"
          value={q}
          onChangeText={setQ}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          testID="shelf-search"
        />
      </View>
      <FlashList
        data={results}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => {
          const has = onShelf(item);
          return (
            <PressableScale
              onPress={() => pick(item)}
              haptic={has ? undefined : 'success'}
              scaleTo={0.98}
              accessibilityLabel={`${item.brand} ${item.name}${has ? ', on your shelf' : ''}`}
              accessibilityState={{ selected: has }}
              style={styles.row}
              testID={`product-${item.id}`}
            >
              <View style={styles.text}>
                <Text variant="caption" tone="tertiary">
                  {item.brand} · {CATEGORY_LABELS[item.category]}
                </Text>
                <Text variant="callout" numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
              {has ? (
                <View style={[styles.mark, styles.added]}>
                  <Check size={16} color={theme.colors.text.onAccent} strokeWidth={3} />
                </View>
              ) : (
                <View style={[styles.mark, styles.add]}>
                  <Plus size={16} color={theme.colors.accent} strokeWidth={2.6} />
                </View>
              )}
            </PressableScale>
          );
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={SearchX}
              title="Not in the catalogue yet"
              message="Try the brand name on its own. We add products people ask for."
            />
          )
        }
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: space.xxl }}
      />
    </Screen>
  );
}
