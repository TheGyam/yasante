import { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Images, Link2, Lock, Pencil, Share as ShareIcon, Trash2, X } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  FollowingSheet,
  MakeItYoursSheet,
  ShareSheet,
  SharedCollectionView,
  shareCounts,
  useCollectionItems,
  useCollections,
  useDeleteCollection,
  useMakeCollectionMine,
  useRemoveFromCollection,
  useShareCollection,
  useUnfollow,
  useUpdateCollection,
  type Collection,
} from '@/features/planner';
import { useNeedsUsername } from '@/features/profile';
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

const COLUMNS = 3;

// Virtualised: someone who saves every look she likes fills this without limit.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

const useStyles = makeStyles(t => ({
  header: { gap: space.xl, marginBottom: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleText: { flex: 1 },
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
  basedOn: { marginTop: -space.md },
}));

/** One collection: what's in it, what it's called, and who can see it. */
export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const needsUsername = useNeedsUsername();
  const { data: collections } = useCollections();
  const collection = collections?.find(item => item.id === id);
  const [sharing, setSharing] = useState(false);
  // Shared things show who made them: by username, never an email.
  const openShare = () => (needsUsername ? router.push('/username') : setSharing(true));

  // Someone else's she follows: their page, kept up to date, not hers to edit.
  if (collection?.following) return <FollowedCollection collection={collection} />;

  return (
    <Screen
      title={collection?.name ?? 'Collection'}
      back
      scroll="list"
      testID="collection-screen"
      headerRight={
        collection && (
          <IconButton
            icon={ShareIcon}
            size={36}
            accessibilityLabel="Share this collection"
            onPress={openShare}
            testID="collection-share"
          />
        )
      }
    >
      <CollectionItems onShare={openShare} />
      {collection && (
        <CollectionShareSheet
          collection={collection}
          visible={sharing}
          onClose={() => setSharing(false)}
        />
      )}
    </Screen>
  );
}

function CollectionShareSheet({
  collection,
  visible,
  onClose,
}: {
  collection: Collection;
  visible: boolean;
  onClose: () => void;
}) {
  const share = useShareCollection(collection.id);
  return (
    <ShareSheet
      visible={visible}
      onClose={onClose}
      kind="collection"
      name={collection.name}
      detail={`${collection.itemCount} ${collection.itemCount === 1 ? 'item' : 'items'}`}
      previewUris={collection.previewUris}
      state={collection}
      busy={share.isPending}
      onChange={async sharing => {
        try {
          await share.mutateAsync(sharing);
        } catch (error) {
          haptics.error();
          await notify({
            title: 'Couldn’t change that',
            message: errorMessage(error, 'Check your connection and try again.'),
          });
        }
      }}
    />
  );
}

/** One she follows: the shared page, with what she can do with it now. */
function FollowedCollection({ collection }: { collection: Collection }) {
  const router = useRouter();
  const { data: items = [], isLoading } = useCollectionItems(collection.id);
  const unfollow = useUnfollow('collection');
  const makeMine = useMakeCollectionMine();
  const [sheet, setSheet] = useState<'following' | 'make' | null>(null);
  const following = collection.following!;
  const first = following.author.name.split(' ')[0];

  return (
    <Screen title={collection.name} back scroll="list" testID="followed-collection">
      <SharedCollectionView
        name={collection.name}
        author={following.author}
        itemCount={collection.itemCount}
        updatedAt={following.updatedAt}
        previewUris={collection.previewUris ?? []}
        items={items}
        loading={isLoading}
        following
        onFollow={() => {}}
        onFollowing={() => setSheet('following')}
        onMakeItYours={() => setSheet('make')}
      />
      <FollowingSheet
        visible={sheet === 'following'}
        onClose={() => setSheet(null)}
        authorName={first}
        onMakeItYours={() => setSheet('make')}
        onUnfollow={async () => {
          setSheet(null);
          const yes = await confirm({
            title: `Unfollow ${collection.name}?`,
            message: 'It leaves your Planner. You can follow it again from the link.',
            confirmLabel: 'Unfollow',
            destructive: true,
          });
          if (!yes) return;
          await unfollow.mutateAsync(collection.id);
          router.back();
        }}
      />
      <MakeItYoursSheet
        visible={sheet === 'make'}
        onClose={() => setSheet(null)}
        name={collection.name}
        authorName={first}
        what={`the ${collection.itemCount} looks`}
        busy={makeMine.isPending}
        onConfirm={() =>
          makeMine.mutate(
            { from: { id: collection.id }, name: collection.name },
            {
              onSuccess: mine => {
                setSheet(null);
                haptics.success();
                router.replace(`/collections/${mine.id}`);
              },
            }
          )
        }
      />
    </Screen>
  );
}

function CollectionItems({ onShare }: { onShare: () => void }) {
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
  // on a Note10+). A placeholder holds the space while it slides; cached items fill
  // it the moment it lands.
  const arrived = useTransitionDone();
  const showGrid = arrived && !isLoading;

  const [name, setName] = useState('');
  // The name field exists only while renaming: creating a text field is one of the
  // costliest things a page can do as it opens on Android (a third of frames late).
  const [renaming, setRenaming] = useState(false);
  const update = useUpdateCollection();
  const removeItem = useRemoveFromCollection(id);
  const remove = useDeleteCollection();

  useEffect(() => {
    if (collection) setName(collection.name);
  }, [collection]);

  const rename = () => {
    setRenaming(false);
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
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <ScreenTitle title={collection?.name ?? 'Collection'} />
        </View>
        {!renaming && (
          <IconButton
            icon={Pencil}
            variant="plain"
            size={36}
            accessibilityLabel="Rename this collection"
            onPress={() => setRenaming(true)}
          />
        )}
      </View>
      {renaming && (
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          onBlur={rename}
          onSubmitEditing={rename}
          returnKeyType="done"
          autoCapitalize="sentences"
          autoFocus
        />
      )}
      {!!collection?.basedOn && (
        <Text
          variant="footnote"
          tone="secondary"
          style={styles.basedOn}
          onPress={
            collection.basedOn.code
              ? () => router.push(`/c/${collection.basedOn!.code}`)
              : undefined
          }
          suppressHighlighting
        >
          Based on {collection.basedOn.name} by{' '}
          <Text variant="footnote" tone={collection.basedOn.code ? 'accent' : 'secondary'}>
            {collection.basedOn.authorName}
          </Text>
        </Text>
      )}
      <Section>
        <ListRow
          title={collection?.sharing === 'link' ? 'Anyone with the link' : 'Only you'}
          subtitle={
            collection?.sharing === 'link'
              ? shareCounts(collection.followers, collection.madeItTheirs) ||
                'Anyone you send the link to can see it.'
              : 'Share it so others can follow it or make it theirs.'
          }
          icon={collection?.sharing === 'link' ? Link2 : Lock}
          iconTone={collection?.sharing === 'link' ? 'accent' : 'neutral'}
          onPress={onShare}
          testID="collection-sharing"
        />
      </Section>
      {!showGrid && <Skeleton height={160} />}
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
