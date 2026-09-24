import { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Images, Trash2, X } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  useCollectionItems,
  useCollections,
  useDeleteCollection,
  useRemoveFromCollection,
  useUpdateCollection,
} from '@/features/planner';
import { useTransitionDone } from '@/shared/hooks/useTransitionDone';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { Input } from '@/shared/ui/Input';
import { useContentInsets } from '@/shared/ui/layout';
import { ListRow } from '@/shared/ui/ListRow';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen, ScreenTitle, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';

const COLUMNS = 3;

// Virtualised: someone who saves every look she likes fills this without limit.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

const useStyles = makeStyles(t => ({
  header: { gap: space.xl, marginBottom: space.lg },
  cell: { flex: 1, paddingHorizontal: 3, paddingBottom: space.sm, gap: 4 },
  photo: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radius.sm,
    backgroundColor: t.colors.glass.fillStrong,
    overflow: 'hidden',
  },
  drop: { position: 'absolute', top: space.xs, right: space.xs },
  footer: { paddingTop: space.xl },
}));

/** One collection: what's in it, what it's called, and who can see it. */
export default function CollectionScreen() {
  return (
    <Screen title="Collection" back scroll="list" testID="collection-screen">
      <CollectionItems />
    </Screen>
  );
}

function CollectionItems() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: collections } = useCollections();
  const collection = collections?.find(item => item.id === id);
  const { data: items = [], isLoading, isRefetching, refetch } = useCollectionItems(id);
  // The grid is built once the page has slid in: building it with the page, even
  // from the cache, made the slide start late and stutter (a third of frames late
  // on a Note10+). Cached items are there the moment it lands; only a real wait for
  // the network shows a placeholder.
  const arrived = useTransitionDone();
  const showGrid = arrived && !isLoading;

  const [name, setName] = useState('');
  const update = useUpdateCollection();
  const removeItem = useRemoveFromCollection(id);
  const remove = useDeleteCollection();

  useEffect(() => {
    if (collection) setName(collection.name);
  }, [collection]);

  const rename = () => {
    const next = name.trim();
    if (!next || next === collection?.name) return;
    update.mutate({ id, name: next });
  };

  const confirmDelete = async () => {
    const yes = await confirm({
      title: `Delete ${collection?.name ?? 'this collection'}?`,
      message: 'The looks and articles in it stay saved elsewhere — only the set goes.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!yes) return;
    try {
      await remove.mutateAsync(id);
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t delete it',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  const header = (
    <View style={styles.header}>
      <ScreenTitle title={collection?.name ?? 'Collection'} />
      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        onBlur={rename}
        onSubmitEditing={rename}
        returnKeyType="done"
        autoCapitalize="sentences"
      />
      <Section footer="Private collections are yours alone.">
        <ListRow
          title="Keep it private"
          trailing={
            <Toggle
              value={collection?.isPrivate ?? true}
              onValueChange={isPrivate => update.mutate({ id, isPrivate })}
              accessibilityLabel="Keep it private"
            />
          }
        />
      </Section>
      {isLoading && <Skeleton height={160} />}
    </View>
  );

  return (
    <AnimatedFlashList
      data={showGrid ? items : []}
      numColumns={COLUMNS}
      keyExtractor={item => item.id}
      renderItem={({ item, index }) => (
        <View style={styles.cell}>
          <View>
            {/* Opens what was saved: the look, or the article in Learn. */}
            <PressableScale
              scaleTo={0.97}
              accessibilityLabel={`Open ${item.title ?? `item ${index + 1}`}`}
              onPress={() =>
                router.push(
                  item.kind === 'look' ? `/looks/${item.refId}` : `/content/${item.refId}`
                )
              }
              style={styles.photo}
            >
              {!!item.imageUri && (
                <RemoteImage
                  uri={item.imageUri}
                  style={StyleSheet.absoluteFill}
                  recyclingKey={item.id}
                />
              )}
            </PressableScale>
            <IconButton
              icon={X}
              variant="overlay"
              size={28}
              style={styles.drop}
              accessibilityLabel={`Remove item ${index + 1}`}
              onPress={async () => {
                // A small X on a photo is easy to hit by mistake, and removal can't be undone.
                const yes = await confirm({
                  title: `Remove from ${collection?.name ?? 'this collection'}?`,
                  message: 'It stays wherever else you saved it.',
                  confirmLabel: 'Remove',
                  destructive: true,
                });
                if (yes) removeItem.mutate(item.id);
              }}
            />
          </View>
          {!!item.title && (
            <Text variant="caption" tone="tertiary" numberOfLines={2}>
              {item.title}
            </Text>
          )}
        </View>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        !showGrid ? null : (
          <EmptyState
            icon={Images}
            title="Nothing in here yet"
            message="Save a look from the feed and choose this collection."
          />
        )
      }
      ListFooterComponent={
        <View style={styles.footer}>
          <Button
            label="Delete collection"
            icon={Trash2}
            variant="danger"
            onPress={confirmDelete}
            loading={remove.isPending}
            fullWidth
          />
        </View>
      }
      keyboardShouldPersistTaps="handled"
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
