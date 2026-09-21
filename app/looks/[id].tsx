import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList, useRecyclingState, type FlashListRef } from '@shopify/flash-list';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, ImageOff, MoreHorizontal, X } from 'lucide-react-native';
import { errorMessage, useAuth } from '@/features/auth';
import {
  LookCard,
  postedLabel,
  useAddComment,
  useComments,
  useLook,
  useLookActions,
  useReplies,
  type LookComment,
} from '@/features/looks';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { fonts, GUTTER, makeStyles, radius, space, timing, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ExpandableText } from '@/shared/ui/ExpandableText';
import { IconButton } from '@/shared/ui/IconButton';
import { useContentInsets } from '@/shared/ui/layout';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Screen, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { track } from '@/shared/lib/analytics';

// Threads are virtualised: a look people love can gather hundreds. Replies load
// only when a thread is opened, a page at a time.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

/** Where a reply's avatar sits: under its thread's first comment, not beside it. */
const REPLY_INDENT = 30 + space.sm;

const useStyles = makeStyles(t => ({
  fill: { flex: 1 },
  heading: { marginTop: -space.md, marginBottom: space.md },
  thread: { paddingVertical: space.xs },
  comment: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm },
  replies: { marginLeft: REPLY_INDENT },
  commentText: { flex: 1, gap: 2 },
  commentActions: { flexDirection: 'row', gap: space.lg, marginTop: 2 },
  link: { paddingVertical: space.xs },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginLeft: REPLY_INDENT,
    paddingVertical: space.xs,
  },
  rule: { width: 24, height: 1, backgroundColor: t.colors.separator },
  composer: {
    paddingHorizontal: GUTTER,
    paddingTop: space.sm,
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.glass.border,
    backgroundColor: t.colors.glass.chromeSolid,
  },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  replying: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: space.lg,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: radius.lg,
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: t.colors.text.primary,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accent,
  },
}));

/** One look, whole: the picture, the conversation under it, and a way to join in. */
export default function LookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: look, isLoading } = useLook(id);
  useEffect(() => {
    track('view_look', { lookId: id });
  }, [id]);

  if (!look) {
    return (
      <Screen back testID="look-screen">
        {isLoading ? (
          <Skeleton height={420} />
        ) : (
          <EmptyState
            icon={ImageOff}
            title="This look is gone"
            message="It may have been taken down."
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen back title={look.authorName} scroll="list" testID="look-screen">
      <LookThread id={id} />
    </Screen>
  );
}

interface CommentHandlers {
  onReply: (comment: LookComment) => void;
  onOptions: (comment: LookComment) => void;
}

/** One comment or reply: who, when, what they said, and a way to answer it. */
const CommentRow = memo(function CommentRow({
  comment,
  onReply,
  onOptions,
}: { comment: LookComment } & CommentHandlers) {
  const styles = useStyles();
  const theme = useTheme();
  const reply = !!comment.parentId;
  return (
    <View style={styles.comment}>
      <Avatar uri={comment.authorAvatarUri} name={comment.authorName} size={reply ? 24 : 30} />
      <View style={styles.commentText}>
        <Text variant="footnote" tone="tertiary">
          <Text variant="footnote" style={{ color: theme.colors.text.primary }}>
            {comment.authorName}
          </Text>
          {'  '}
          {postedLabel(comment.createdAt)}
        </Text>
        <ExpandableText
          key={comment.id}
          variant="subhead"
          text={comment.body}
          prefix={
            comment.replyToName ? (
              <Text variant="subhead" tone="accent">
                @{comment.replyToName}{' '}
              </Text>
            ) : undefined
          }
        />
        <View style={styles.commentActions}>
          <Text
            variant="caption"
            tone="secondary"
            onPress={() => onReply(comment)}
            accessibilityRole="button"
            accessibilityLabel={`Reply to ${comment.authorName}`}
            style={styles.link}
            suppressHighlighting
          >
            Reply
          </Text>
        </View>
      </View>
      <IconButton
        icon={MoreHorizontal}
        variant="plain"
        size={30}
        accessibilityLabel={`Options for ${comment.authorName}'s comment`}
        onPress={() => onOptions(comment)}
      />
    </View>
  );
});

/**
 * A top-level comment and its replies. Replies stay folded behind a count until
 * asked for — most people read the top of a conversation, not all of it.
 */
function Thread({
  lookId,
  comment,
  onReply,
  onOptions,
}: { lookId: string; comment: LookComment } & CommentHandlers) {
  const styles = useStyles();
  const theme = useTheme();
  // Recycled rows are reused for other threads; this resets when the thread changes.
  const [open, setOpen] = useRecyclingState(false, [comment.id]);
  const replies = useReplies(lookId, comment.id, open);
  const loaded = replies.data?.pages.flatMap(page => page.data) ?? [];
  const count = comment.replyCount ?? 0;

  // Answering a thread opens it, so the new reply is there to see.
  const answer = useCallback(
    (target: LookComment) => {
      setOpen(true);
      onReply(target);
    },
    [onReply, setOpen]
  );

  return (
    <View style={styles.thread}>
      <CommentRow comment={comment} onReply={answer} onOptions={onOptions} />
      {open && (
        <View style={styles.replies}>
          {loaded.map(reply => (
            <CommentRow key={reply.id} comment={reply} onReply={answer} onOptions={onOptions} />
          ))}
        </View>
      )}
      {count > 0 && (
        <PressableScale
          onPress={() =>
            open && !replies.hasNextPage
              ? setOpen(false)
              : open
                ? replies.fetchNextPage()
                : setOpen(true)
          }
          accessibilityRole="button"
          style={styles.toggle}
        >
          <View style={styles.rule} />
          {replies.isFetching && open ? (
            <ActivityIndicator size="small" color={theme.colors.text.tertiary} />
          ) : (
            <Text variant="caption" tone="secondary">
              {!open
                ? `View ${count} ${count === 1 ? 'reply' : 'replies'}`
                : replies.hasNextPage
                  ? `View ${Math.max(0, count - loaded.length)} more`
                  : 'Hide replies'}
            </Text>
          )}
        </PressableScale>
      )}
    </View>
  );
}

function LookThread({ id }: { id: string }) {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useContentInsets();
  const safe = useSafeAreaInsets();
  const onScroll = useScreenScrollHandler();
  const router = useRouter();
  const actions = useLookActions({ onItsOwnPage: true });
  const { isAuthenticated } = useAuth();
  const listRef = useRef<FlashListRef<LookComment>>(null);
  const [replyingTo, setReplyingTo] = useState<LookComment>();

  const { data: look } = useLook(id);
  const thread = useComments(id);
  const comments = useMemo(
    () => thread.data?.pages.flatMap(page => page.data) ?? [],
    [thread.data]
  );

  const onOptions = useCallback(
    (comment: LookComment) =>
      router.push(
        `/looks/options?kind=comment&id=${comment.id}&lookId=${id}&name=${encodeURIComponent(comment.authorName)}&authorId=${comment.authorId}&mine=${comment.mine ? 1 : 0}`
      ),
    [router, id]
  );
  const onReply = useCallback(
    (comment: LookComment) =>
      isAuthenticated ? setReplyingTo(comment) : router.push('/auth/join'),
    [isAuthenticated, router]
  );
  const renderItem = useCallback(
    ({ item }: { item: LookComment }) => (
      <Thread lookId={id} comment={item} onReply={onReply} onOptions={onOptions} />
    ),
    [id, onReply, onOptions]
  );

  if (!look) return null;

  return (
    <View style={styles.fill}>
      <AnimatedFlashList
        ref={listRef}
        data={comments}
        keyExtractor={comment => comment.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View>
            <LookCard
              look={look}
              detail
              {...actions}
              onOpen={undefined}
              onSave={look.mine ? undefined : actions.onSave}
            />
            <Text variant="overline" tone="tertiary" style={styles.heading}>
              {look.commentCount
                ? `${look.commentCount} ${look.commentCount === 1 ? 'comment' : 'comments'}`
                : 'Comments'}
            </Text>
            {thread.isLoading && <Skeleton height={60} />}
          </View>
        }
        ListEmptyComponent={
          thread.isLoading ? null : (
            <Text variant="subhead" tone="secondary">
              No comments yet. Say what you love about it.
            </Text>
          )
        }
        ListFooterComponent={
          thread.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.accent} style={{ padding: space.lg }} />
          ) : null
        }
        onEndReached={() => {
          if (thread.hasNextPage && !thread.isFetchingNextPage) thread.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
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
        <View style={[styles.composer, { paddingBottom: safe.bottom + space.sm }]}>
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
            lookId={id}
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

function Composer({
  lookId,
  bottom,
  replyingTo,
  onCancelReply,
  onSent,
}: {
  lookId: string;
  bottom: number;
  replyingTo?: LookComment;
  onCancelReply: () => void;
  onSent: (reply: boolean) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const input = useRef<TextInput>(null);
  const [body, setBody] = useState('');
  const add = useAddComment(lookId);
  const ready = body.trim().length > 0 && !add.isPending;

  // Tapping Reply puts the cursor straight in the box.
  useEffect(() => {
    if (replyingTo) input.current?.focus();
  }, [replyingTo]);

  // The send button grows in as soon as there's something to send.
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(withTiming(ready ? 1 : 0, timing.state));
  }, [ready, shown]);
  const sendStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + shown.get() * 0.65,
    transform: [{ scale: 0.85 + shown.get() * 0.15 }],
  }));

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBody('');
    try {
      await add.mutateAsync({ body: text, replyTo: replyingTo });
      haptics.success();
      onSent(!!replyingTo);
    } catch (error) {
      setBody(text);
      haptics.error();
      await notify({
        title: 'Couldn’t post that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <View style={[styles.composer, { paddingBottom: bottom }]}>
      {!!replyingTo && (
        <View style={styles.replying}>
          <Text variant="caption" tone="secondary">
            Replying to {replyingTo.authorName}
          </Text>
          <IconButton
            icon={X}
            variant="plain"
            size={28}
            accessibilityLabel="Stop replying"
            onPress={onCancelReply}
          />
        </View>
      )}
      <View style={styles.composerRow}>
        <TextInput
          ref={input}
          value={body}
          onChangeText={setBody}
          placeholder={replyingTo ? `Reply to ${replyingTo.authorName}` : 'Add a comment'}
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          maxLength={500}
          style={styles.input}
          accessibilityLabel={replyingTo ? `Reply to ${replyingTo.authorName}` : 'Add a comment'}
          testID="comment-input"
        />
        <PressableScale
          onPress={send}
          disabled={!ready}
          accessibilityLabel={replyingTo ? 'Post reply' : 'Post comment'}
          scaleTo={0.9}
          testID="comment-send"
        >
          <Animated.View style={[styles.send, sendStyle]}>
            <ArrowUp size={20} color={theme.colors.text.onAccent} strokeWidth={2.6} />
          </Animated.View>
        </PressableScale>
      </View>
    </View>
  );
}
