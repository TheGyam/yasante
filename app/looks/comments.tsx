import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import {
  Composer,
  Thread,
  useCommentHandlers,
  useComments,
  useLook,
  type LookComment,
} from '@/features/looks';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useContentInsets } from '@/shared/ui/layout';
import { FEED_LIST, ListFooter } from '@/shared/ui/ListFooter';
import { Screen, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * A look's whole conversation, in a sheet over the look, as Instagram, TikTok and
 * Pinterest keep it: the look's own page shows the top of it and More like this.
 */
export default function CommentsScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { data: look } = useLook(id);
  const count = look?.commentCount ?? 0;
  return (
    <Screen
      modal
      scroll="list"
      title={count ? `${count} ${count === 1 ? 'comment' : 'comments'}` : 'Comments'}
      testID="comments-screen"
    >
      <Conversation lookId={id} />
    </Screen>
  );
}

function Conversation({ lookId }: { lookId: string }) {
  const insets = useContentInsets({ modal: true });
  const safe = useSafeAreaInsets();
  const onScroll = useScreenScrollHandler();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const listRef = useRef<FlashListRef<LookComment>>(null);
  const thread = useComments(lookId);
  const comments = useMemo(
    () => thread.data?.pages.flatMap(page => page.data) ?? [],
    [thread.data]
  );
  const [replyingTo, setReplyingTo] = useState<LookComment>();
  const handlers = useCommentHandlers(lookId, setReplyingTo);
  const renderItem = useCallback(
    ({ item }: { item: LookComment }) => <Thread lookId={lookId} comment={item} {...handlers} />,
    [lookId, handlers]
  );

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        ref={listRef}
        data={comments}
        keyExtractor={comment => comment.id}
        renderItem={renderItem}
        ListEmptyComponent={
          thread.isLoading ? (
            <Skeleton height={60} />
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="No comments yet"
              message="Say what you love about it."
            />
          )
        }
        ListFooterComponent={<ListFooter more={!!thread.hasNextPage} />}
        onEndReached={() => {
          if (thread.hasNextPage && !thread.isFetchingNextPage) thread.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        drawDistance={FEED_LIST.drawDistance}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: space.xl,
          paddingHorizontal: GUTTER,
        }}
      />
      {!isAuthenticated ? (
        // Anyone can read the conversation; joining it takes an account.
        <View style={{ paddingHorizontal: GUTTER, paddingBottom: safe.bottom + space.sm }}>
          <Button
            label="Sign in to comment"
            variant="secondary"
            onPress={() => router.push('/auth/join')}
            fullWidth
          />
        </View>
      ) : (
        <KeyboardStickyView offset={{ closed: 0, opened: safe.bottom }}>
          <Composer
            lookId={lookId}
            bottom={safe.bottom + space.sm}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(undefined)}
            onSent={reply => {
              setReplyingTo(undefined);
              // A new thread goes on top; a reply shows in its own open thread.
              if (!reply) listRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
          />
        </KeyboardStickyView>
      )}
    </View>
  );
}
