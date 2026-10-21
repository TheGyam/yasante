import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { useRecyclingState } from '@shopify/flash-list';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ArrowUp, MoreHorizontal, X } from 'lucide-react-native';
import { errorMessage, useAuth } from '@/features/auth';
import { useNeedsUsername } from '@/features/profile';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { fonts, GUTTER, makeStyles, radius, space, timing, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { notify } from '@/shared/ui/dialog';
import { ExpandableText } from '@/shared/ui/ExpandableText';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';
import { postedLabel } from '../format';
import { useAddComment, useReplies, useToggleCommentLike } from '../hooks';
import type { LookComment } from '../types';
import { LikeButton } from './LikeButton';

/**
 * A look's conversation, shared by its page (a preview) and its comments sheet (all
 * of it): a comment and its replies, and the box to add one.
 */

/** Where a reply's avatar sits: under its thread's first comment, not beside it. */
const REPLY_INDENT = 30 + space.sm;

const useStyles = makeStyles(t => ({
  fill: { flex: 1 },
  thread: { paddingVertical: space.xs },
  comment: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm },
  replies: { marginLeft: REPLY_INDENT },
  commentText: { flex: 1, gap: 2 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: 2 },
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

export interface CommentHandlers {
  onReply: (comment: LookComment) => void;
  onOptions: (comment: LookComment) => void;
  onLike: (comment: LookComment) => void;
}

/** One comment or reply: who, when, what they said, and a way to answer it. */
const CommentRow = memo(function CommentRow({
  comment,
  onReply,
  onOptions,
  onLike,
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
          <IconButton
            icon={MoreHorizontal}
            variant="plain"
            size={24}
            accessibilityLabel={`Options for ${comment.authorName}'s comment`}
            onPress={() => onOptions(comment)}
          />
        </View>
      </View>
      {/* The heart sits on the right, where thumbs expect it, with its count. */}
      <LikeButton
        id={comment.id}
        liked={comment.liked}
        count={comment.likeCount}
        size={15}
        onToggle={() => onLike(comment)}
      />
    </View>
  );
});

/**
 * A top-level comment and its replies. Replies stay folded behind a count until
 * asked for — most people read the top of a conversation, not all of it.
 */
export function Thread({
  lookId,
  comment,
  onReply,
  onOptions,
  onLike,
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
      <CommentRow comment={comment} onReply={answer} onOptions={onOptions} onLike={onLike} />
      {open && (
        <View style={styles.replies}>
          {loaded.map(reply => (
            <CommentRow
              key={reply.id}
              comment={reply}
              onReply={answer}
              onOptions={onOptions}
              onLike={onLike}
            />
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

export function Composer({
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
  // The real text field exists from the first tap on the bar (or Reply) onwards.
  const [typing, setTyping] = useState(false);
  const add = useAddComment(lookId);
  const router = useRouter();
  const needsUsername = useNeedsUsername();
  const ready = body.trim().length > 0 && !add.isPending;

  // Tapping Reply puts the cursor straight in the box.
  useEffect(() => {
    if (!replyingTo) return;
    setTyping(true);
    input.current?.focus();
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
    // A comment shows her username: asked for first, and what she wrote stays here.
    if (needsUsername) return router.push('/username');
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
        {!typing ? (
          // A lookalike until she goes to write. Creating a text field is one of the
          // costliest things an Android page does, and made with the page it landed
          // in the frames the photo opens in. Tapping it makes the real one, focused.
          <PressableScale
            onPress={() => setTyping(true)}
            scaleTo={1}
            accessibilityRole="button"
            accessibilityLabel="Add a comment"
            containerStyle={styles.fill}
            style={styles.input}
          >
            <Text variant="callout" tone="tertiary">
              Add a comment
            </Text>
          </PressableScale>
        ) : (
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
            autoFocus
            testID="comment-input"
          />
        )}
        <PressableScale
          onPress={send}
          disabled={!ready}
          accessibilityLabel={replyingTo ? 'Post reply' : 'Post comment'}
          scaleTo={0.9}
          hitSlop={4}
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

/** Reply, options and like for a look's comments; signed out, each asks her to join. */
export function useCommentHandlers(
  lookId: string,
  onReplyTo: (comment: LookComment) => void
): CommentHandlers {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { mutate: likeComment } = useToggleCommentLike();
  const onOptions = useCallback(
    (comment: LookComment) =>
      router.push(
        `/looks/options?kind=comment&id=${comment.id}&lookId=${lookId}&name=${encodeURIComponent(comment.authorName)}&authorId=${comment.authorId}&mine=${comment.mine ? 1 : 0}`
      ),
    [router, lookId]
  );
  const onReply = useCallback(
    (comment: LookComment) => (isAuthenticated ? onReplyTo(comment) : router.push('/auth/join')),
    [isAuthenticated, onReplyTo, router]
  );
  const onLike = useCallback(
    (comment: LookComment) =>
      isAuthenticated
        ? likeComment({ id: comment.id, liked: !comment.liked })
        : router.push('/auth/join'),
    [isAuthenticated, likeComment, router]
  );
  return { onReply, onOptions, onLike };
}
