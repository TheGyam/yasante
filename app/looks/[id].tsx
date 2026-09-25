import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { FlashList, useRecyclingState, type FlashListRef } from '@shopify/flash-list';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, ImageOff, MoreHorizontal, X } from 'lucide-react-native';
import { errorMessage, useAuth } from '@/features/auth';
import {
  LikeButton,
  LookCard,
  postedLabel,
  takeHero,
  useAddComment,
  useComments,
  useLook,
  useLookActions,
  useReplies,
  useToggleCommentLike,
  type LookComment,
} from '@/features/looks';
import { useNeedsUsername } from '@/features/profile';
import { usePrefetchStylistPage } from '@/features/stylist';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import {
  EASE_OUT,
  fonts,
  GUTTER,
  makeStyles,
  radius,
  space,
  timing,
  useTheme,
} from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ExpandableText } from '@/shared/ui/ExpandableText';
import { IconButton } from '@/shared/ui/IconButton';
import { useContentInsets } from '@/shared/ui/layout';
import { FEED_LIST, ListFooter } from '@/shared/ui/ListFooter';
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

/** Photo growing from its tile into place; a little quicker back, as leaving should be. */
const OPEN_MS = 340;
const CLOSE_MS = 280;

/**
 * One look, whole: the picture, the conversation under it, and a way to join in.
 *
 * Opened from a feed, the photo grows out of the tile that was tapped while the
 * page fades in around it over the feed (the route is a transparent overlay), and
 * shrinks back into the tile on the way out. Opened any other way, or with reduced
 * motion, the page just fades.
 */
export default function LookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: look, isLoading } = useLook(id);
  const navigation = useNavigation();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { height: screenHeight } = useWindowDimensions();
  useEffect(() => {
    track('view_look', { lookId: id });
  }, [id]);

  // Taken once: the tile's photo and where it sat.
  const [hero] = useState(() => (reduced ? null : takeHero(id)));
  const photo = useRef<View>(null);
  // Positions are measured in window coordinates, but the moving copy is drawn inside
  // this page, which on Android starts below the status bar. Where the page sits in
  // the window is subtracted when drawing, so the copy lands exactly on the photo.
  const page = useRef<View>(null);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  // 0 = still the feed, 1 = the look's page.
  const progress = useSharedValue(0);
  const x = useSharedValue(hero?.from.x ?? 0);
  const y = useSharedValue(hero?.from.y ?? 0);
  const w = useSharedValue(hero?.from.width ?? 0);
  const h = useSharedValue(hero?.from.height ?? 0);
  // 1 while the moving copy covers the photo (the real one hidden under it), 0 once
  // it has landed. A shared value, not state: handing over at either end of the
  // animation never re-renders the page.
  const cover = useSharedValue(hero ? 1 : 0);
  // Comments are built once the page has arrived, so the opening frames only carry
  // the photo and the look's details.
  const [settled, setSettled] = useState(false);
  const started = useRef(false);
  const closing = useRef(false);

  const finish = useCallback(() => {
    cover.set(0);
    setSettled(true);
  }, [cover]);

  // The page's top spacing can arrive after the photo was measured, moving it without
  // telling it. So check where it really is before handing over: if it moved, glide
  // the last few pixels rather than jump.
  const land = useCallback(() => {
    const real = photo.current;
    if (!hero || !real) return finish();
    real.measureInWindow((rx, ry, rw, rh) => {
      const off = Math.abs(rx - x.get()) + Math.abs(ry - y.get()) + Math.abs(rw - w.get());
      if (!rw || off < 2) return finish();
      const nudge = { duration: 120, easing: EASE_OUT };
      x.set(withTiming(rx, nudge));
      y.set(withTiming(ry, nudge));
      w.set(withTiming(rw, nudge));
      h.set(
        withTiming(rh, nudge, done => {
          if (done) scheduleOnRN(finish);
        })
      );
    });
  }, [hero, finish, x, y, w, h]);

  const fadeIn = useCallback(() => {
    if (started.current) return;
    started.current = true;
    progress.set(
      withTiming(1, { duration: 220, easing: EASE_OUT }, done => {
        if (done) scheduleOnRN(finish);
      })
    );
  }, [progress, finish]);

  const flyTo = useCallback(
    (tx: number, ty: number, tw: number, th: number) => {
      if (started.current) return;
      if (!tw || !th) return fadeIn();
      started.current = true;
      const move = { duration: OPEN_MS, easing: EASE_OUT };
      x.set(withTiming(tx, move));
      y.set(withTiming(ty, move));
      w.set(withTiming(tw, move));
      h.set(withTiming(th, move));
      progress.set(
        withTiming(1, move, done => {
          if (done) scheduleOnRN(land);
        })
      );
    },
    [fadeIn, land, progress, x, y, w, h]
  );

  // Once the real photo has a place, fly the tile's copy onto it. Two frames later,
  // once the page has finished building: its first layout comes before the page's
  // top spacing has settled, and starting while the page is still being mounted
  // drops frames (measured on a Note10+: 100ms+ frames, against none this way).
  const onPhotoLayout = useCallback(() => {
    if (!hero || started.current) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        page.current?.measureInWindow((px, py) => {
          originX.set(px);
          originY.set(py);
          photo.current?.measureInWindow(flyTo);
        })
      )
    );
  }, [hero, flyTo, originX, originY]);

  // Nothing to grow from (a link, a notification, reduced motion), or the photo
  // never laid out (still loading): fade in rather than wait.
  useEffect(() => {
    if (!hero) return fadeIn();
    // Only if the flight never started; once it has, it lands on its own.
    const fallback = setTimeout(() => {
      if (started.current) return;
      cover.set(0);
      fadeIn();
    }, 500);
    return () => clearTimeout(fallback);
  }, [hero, fadeIn, cover]);

  // Leaving by any route (back button, hardware back, a gesture) plays it in reverse.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        if (closing.current) return;
        e.preventDefault();
        closing.current = true;
        const leave = () => navigation.dispatch(e.data.action);
        const fadeOut = () =>
          progress.set(
            withTiming(0, { duration: 180, easing: EASE_OUT }, done => {
              if (done) scheduleOnRN(leave);
            })
          );
        if (!hero || !photo.current) return fadeOut();
        photo.current.measureInWindow((px, py, pw, ph) => {
          // Scrolled away from the photo: there's nothing to shrink back.
          if (!pw || py + ph < 0 || py > screenHeight) return fadeOut();
          x.set(px);
          y.set(py);
          w.set(pw);
          h.set(ph);
          cover.set(1);
          const move = { duration: CLOSE_MS, easing: EASE_OUT };
          x.set(withTiming(hero.from.x, move));
          y.set(withTiming(hero.from.y, move));
          w.set(withTiming(hero.from.width, move));
          h.set(withTiming(hero.from.height, move));
          progress.set(
            withTiming(0, move, done => {
              if (done) scheduleOnRN(leave);
            })
          );
        });
      }),
    [navigation, hero, progress, screenHeight, x, y, w, h, cover]
  );

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.get() }));
  // The photo leads; everything else follows it in, and leaves first.
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.35, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const flight = useAnimatedStyle(() => ({
    opacity: cover.get(),
    left: x.get() - originX.get(),
    top: y.get() - originY.get(),
    width: w.get(),
    height: h.get(),
  }));
  const photoStyle = useAnimatedStyle(() => ({ opacity: 1 - cover.get() }));

  return (
    <View ref={page} collapsable={false} style={heroStyles.fill}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }, backdrop]}
      />
      <Animated.View style={[heroStyles.fill, content]}>
        {look ? (
          <Screen back title={look.authorName} scroll="list" opaque={false} testID="look-screen">
            <LookThread
              id={id}
              settled={settled}
              photoRef={photo}
              onPhotoLayout={onPhotoLayout}
              // Hidden under the moving copy, so there's only ever one photo on screen.
              photoStyle={photoStyle}
            />
          </Screen>
        ) : (
          <Screen back opaque={false} testID="look-screen">
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
        )}
      </Animated.View>
      {hero && (
        // Absolute, and nothing inside but its image: moving its frame lays out this
        // one view, not the page. It stays mounted, invisible between the two flights,
        // so closing starts on the UI thread without waiting for React.
        <Animated.View pointerEvents="none" style={[heroStyles.flight, flight]}>
          <Image
            source={{ uri: hero.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      )}
    </View>
  );
}

const heroStyles = StyleSheet.create({
  fill: { flex: 1 },
  flight: { position: 'absolute', overflow: 'hidden', borderRadius: radius.lg },
});

interface CommentHandlers {
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
function Thread({
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

function LookThread({
  id,
  settled,
  photoRef,
  onPhotoLayout,
  photoStyle,
}: {
  id: string;
  /** False while the page is still arriving: comments wait until it has. */
  settled: boolean;
  photoRef: RefObject<View | null>;
  onPhotoLayout: () => void;
  photoStyle: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const insets = useContentInsets();
  const safe = useSafeAreaInsets();
  const onScroll = useScreenScrollHandler();
  const router = useRouter();
  const actions = useLookActions({ onItsOwnPage: true });
  const { isAuthenticated } = useAuth();
  const listRef = useRef<FlashListRef<LookComment>>(null);
  const [replyingTo, setReplyingTo] = useState<LookComment>();

  const { data: look } = useLook(id);
  usePrefetchStylistPage(settled ? look?.stylist?.handle : undefined);
  const thread = useComments(id);
  const focused = useIsFocused();
  // Fetched straight away, built only once the page has arrived.
  const comments = useMemo(
    () => (settled ? (thread.data?.pages.flatMap(page => page.data) ?? []) : []),
    [thread.data, settled]
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
  const { mutate: likeComment } = useToggleCommentLike();
  const onLike = useCallback(
    (comment: LookComment) =>
      isAuthenticated
        ? likeComment({ id: comment.id, liked: !comment.liked })
        : router.push('/auth/join'),
    [isAuthenticated, likeComment, router]
  );
  const renderItem = useCallback(
    ({ item }: { item: LookComment }) => (
      <Thread lookId={id} comment={item} onReply={onReply} onOptions={onOptions} onLike={onLike} />
    ),
    [id, onReply, onOptions, onLike]
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
              photoRef={photoRef}
              onPhotoLayout={onPhotoLayout}
              photoStyle={photoStyle}
            />
            <Text variant="overline" tone="tertiary" style={styles.heading}>
              {look.commentCount
                ? `${look.commentCount} ${look.commentCount === 1 ? 'comment' : 'comments'}`
                : 'Comments'}
            </Text>
            {(thread.isLoading || !settled) && <Skeleton height={60} />}
          </View>
        }
        ListEmptyComponent={
          thread.isLoading || !settled ? null : (
            <Text variant="subhead" tone="secondary">
              No comments yet. Say what you love about it.
            </Text>
          )
        }
        ListFooterComponent={<ListFooter more={!!thread.hasNextPage} />}
        onEndReached={() => {
          // A screen covered by another reports it's at the end; only the visible one loads more.
          if (settled && focused && thread.hasNextPage && !thread.isFetchingNextPage) {
            thread.fetchNextPage();
          }
        }}
        // The next batch only as she nears the end of this one, not screens ahead.
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
  const router = useRouter();
  const needsUsername = useNeedsUsername();
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
