import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CircleMinus, CopyPlus, Images } from 'lucide-react-native';
import { SEP } from '@/shared/lib/format';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useContentInsets } from '@/shared/ui/layout';
import { ListRow } from '@/shared/ui/ListRow';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Rise } from '@/shared/ui/Rise';
import { useScreenScrollHandler } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Sheet } from '@/shared/ui/Sheet';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import type { CollectionItem, SharedAuthor } from '../types';
import { AuthorLine, FollowButton, Mosaic, sharedStyles, updatedLabel } from './SharedParts';

const COLUMNS = 3;

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

const useStyles = makeStyles(t => ({
  header: { gap: space.lg, marginBottom: space.lg },
  titleBlock: { gap: space.sm },
  cell: { flex: 1, paddingHorizontal: 3, paddingBottom: space.sm },
  photo: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radius.sm,
    backgroundColor: t.colors.glass.fillStrong,
    overflow: 'hidden',
  },
}));

export interface SharedCollectionViewProps {
  name: string;
  author: SharedAuthor;
  itemCount: number;
  updatedAt: string;
  previewUris: string[];
  items: CollectionItem[];
  loading?: boolean;
  following: boolean;
  onFollow: () => void;
  /** "Tagging along": what she can do with it now. */
  onFollowing: () => void;
  onMakeItYours: () => void;
  busy?: boolean;
}

/**
 * Someone's shared collection: a cover of its first pictures, who made it, Tag along
 * and Make it yours, then everything in it. The same page whether she opened a link
 * or it's one she tags along with.
 */
export function SharedCollectionView({
  name,
  author,
  itemCount,
  updatedAt,
  previewUris,
  items,
  loading,
  following,
  onFollow,
  onFollowing,
  onMakeItYours,
  busy,
}: SharedCollectionViewProps) {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();

  const header = (
    <View style={styles.header}>
      <Mosaic uris={previewUris} recyclingKey={`shared-${name}`} />
      <View style={styles.titleBlock}>
        <Text variant="title1" accessibilityRole="header">
          {name}
        </Text>
        <AuthorLine
          author={author}
          detail={`${itemCount} ${itemCount === 1 ? 'look' : 'looks'}${SEP}${updatedLabel(updatedAt)}`}
        />
      </View>
      <View style={sharedStyles.actions}>
        <FollowButton
          following={following}
          onPress={following ? onFollowing : onFollow}
          loading={busy}
          testID="shared-follow"
        />
        {!following && (
          <Animated.View entering={FadeIn} style={{ flex: 1 }}>
            <Button
              label="Make it yours"
              variant="secondary"
              onPress={onMakeItYours}
              fullWidth
              testID="shared-make-it-yours"
            />
          </Animated.View>
        )}
      </View>
      {loading && <Skeleton height={160} />}
    </View>
  );

  return (
    <AnimatedFlashList
      data={loading ? [] : items}
      numColumns={COLUMNS}
      keyExtractor={item => item.id}
      renderItem={({ item, index }) => (
        <Rise index={Math.floor(index / COLUMNS) % 6} style={styles.cell}>
          <PressableScale
            scaleTo={0.97}
            accessibilityLabel={`Open ${item.title ?? `item ${index + 1}`}`}
            onPress={() =>
              router.push(item.kind === 'look' ? `/looks/${item.refId}` : `/content/${item.refId}`)
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
        </Rise>
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? null : (
          <EmptyState
            icon={Images}
            title="Nothing in here yet"
            message={`${author.name} hasn’t added anything.`}
          />
        )
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingHorizontal: GUTTER,
      }}
      extraData={theme}
    />
  );
}

/** What she can do with one she tags along with: make it hers, or stop. */
export function FollowingSheet({
  visible,
  onClose,
  authorName,
  onMakeItYours,
  onUnfollow,
}: {
  visible: boolean;
  onClose: () => void;
  authorName: string;
  onMakeItYours: () => void;
  onUnfollow: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: space.md, paddingBottom: space.lg }}>
        <Text variant="footnote" tone="secondary" align="center">
          It updates when {authorName} changes it.
        </Text>
        <Section>
          <ListRow
            title="Make it yours"
            subtitle="Your own version to change. It stops updating."
            icon={CopyPlus}
            onPress={onMakeItYours}
            testID="following-make-it-yours"
          />
          <ListRow
            title="Stop tagging along"
            icon={CircleMinus}
            destructive
            onPress={onUnfollow}
            testID="following-unfollow"
          />
        </Section>
      </View>
    </Sheet>
  );
}

/** While a shared link loads: the page's own shape, never a blank screen. */
export function SharedLoading() {
  const insets = useContentInsets();
  return (
    <View style={{ paddingTop: insets.top, paddingHorizontal: GUTTER, gap: space.lg }}>
      <Skeleton height={232} />
      <Skeleton height={34} width="60%" />
      <Skeleton height={40} width="75%" />
      <View style={sharedStyles.actions}>
        <View style={{ flex: 1 }}>
          <Skeleton height={48} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton height={48} />
        </View>
      </View>
    </View>
  );
}
