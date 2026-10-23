import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  useFocusEffect,
  useIsFocused,
  useNavigationState,
  useRoute,
} from '@react-navigation/native';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ImageOff } from 'lucide-react-native';
import { DEFAULT_CURRENCY, formatMoney, SEP } from '@/shared/lib/format';
import { useAuth } from '@/features/auth';
import {
  Composer,
  LookCard,
  LookTile,
  takeHero,
  Thread,
  useCommentHandlers,
  useComments,
  useFeedDwell,
  useFeedTracking,
  useLook,
  useLookActions,
  LooksFooter,
  LooksSkeleton,
  useRelatedLooks,
  type Look,
  type LookComment,
} from '@/features/looks';
import { useUser } from '@/features/profile';
import { usePrefetchStylistPage, useStylistsForStyle } from '@/features/stylist';
import { useRouter } from '@/shared/lib/navigation';
import { EASE_OUT, GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useContentInsets } from '@/shared/ui/layout';
import { FEED_LIST } from '@/shared/ui/ListFooter';
import { PressableScale } from '@/shared/ui/PressableScale';
import { overlayCovers, Screen, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { track } from '@/shared/lib/analytics';

// Threads are virtualised: a look people love can gather hundreds. Replies load
// only when a thread is opened, a page at a time.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

/** The grid's tiles carry their own inset: the page's own parts line up with them. */
const CARD_INSET = space.xs + 1;

const useStyles = makeStyles(t => ({
  fill: { flex: 1 },
  header: { marginHorizontal: CARD_INSET },
  commentsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -space.md,
    paddingVertical: space.xs,
  },
  viewAll: { paddingVertical: space.sm },
  moreHead: { marginTop: space.xxl, marginBottom: space.md },
  composer: {
    paddingHorizontal: GUTTER,
    paddingTop: space.sm,
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.glass.border,
    backgroundColor: t.colors.glass.chromeSolid,
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
  // How long she stayed, when she came from the feed.
  useFeedDwell(id);
  useEffect(() => {
    track('view_look', { lookId: id });
  }, [id]);

  // Taken once: the tile's photo and where it sat.
  const [hero] = useState(() => (reduced ? null : takeHero(id)));
  // The photo on this page and the page itself, measured on the UI thread on every
  // frame the copy moves: it aims at where the photo really is at that moment, so it
  // can't miss if the page settles a little late. (Aiming at a position measured
  // once, it used to land, pause, and glide the last few pixels.)
  const photo = useAnimatedRef<View>();
  const page = useAnimatedRef<View>();
  // Where the tile sat, relative to this page (which on Android starts below the
  // status bar). Both measured the same way, in window coordinates.
  const fromX = useSharedValue(hero?.from.x ?? 0);
  const fromY = useSharedValue(hero?.from.y ?? 0);
  // 0 = still the feed, 1 = the look's page.
  const progress = useSharedValue(0);
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
    overlayCovers.set(true);
  }, [cover]);
  // Whatever's below stops drawing while this covers it (see overlayCovers): again
  // whenever this is back on top, and not while anything else is.
  useFocusEffect(
    useCallback(() => {
      if (settled) overlayCovers.set(true);
      return () => overlayCovers.set(false);
    }, [settled])
  );

  const fadeIn = useCallback(() => {
    if (started.current) return;
    started.current = true;
    progress.set(
      withTiming(1, { duration: 220, easing: EASE_OUT }, done => {
        if (done) scheduleOnRN(finish);
      })
    );
  }, [progress, finish]);

  // Once the real photo has a place, fly the tile's copy onto it. Two frames later,
  // once the page has finished building: starting while it's still being mounted
  // drops frames (measured on a Note10+: 100ms+ frames, against none this way).
  const onPhotoLayout = useCallback(() => {
    if (!hero || started.current) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        page.current?.measureInWindow((px, py) => {
          if (started.current) return;
          started.current = true;
          fromX.set(hero.from.x - px);
          fromY.set(hero.from.y - py);
          progress.set(
            withTiming(1, { duration: OPEN_MS, easing: EASE_OUT }, done => {
              if (done) scheduleOnRN(finish);
            })
          );
        })
      )
    );
  }, [hero, page, fromX, fromY, progress, finish]);

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

  // Leaving by any route (back button, hardware back, a gesture) plays it in reverse:
  // the same flight, run backwards from wherever the photo is now.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        if (closing.current) return;
        e.preventDefault();
        closing.current = true;
        // The screen below shows again before this starts shrinking into it.
        overlayCovers.set(false);
        const leave = () => navigation.dispatch(e.data.action);
        const back = (duration: number) =>
          progress.set(
            withTiming(0, { duration, easing: EASE_OUT }, done => {
              if (done) scheduleOnRN(leave);
            })
          );
        if (!hero || !photo.current) return back(180);
        photo.current.measureInWindow((_px, py, pw, ph) => {
          // Scrolled away from the photo: there's nothing to shrink back.
          if (!pw || py + ph < 0 || py > screenHeight) return back(180);
          cover.set(1);
          back(CLOSE_MS);
        });
      }),
    [navigation, hero, photo, progress, screenHeight, cover]
  );

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.get() }));
  // The photo leads; everything else follows it in, and leaves first.
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.35, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const flight = useAnimatedStyle(() => {
    if (!hero) return { opacity: 0 };
    const p = progress.get();
    const at = measure(page);
    const to = measure(photo);
    // Until the photo has a place, the copy stays where the tile was.
    const tx = to && at ? to.pageX - at.pageX : fromX.get();
    const ty = to && at ? to.pageY - at.pageY : fromY.get();
    const tw = to ? to.width : hero.from.width;
    const th = to ? to.height : hero.from.height;
    return {
      opacity: cover.get(),
      left: fromX.get() + (tx - fromX.get()) * p,
      top: fromY.get() + (ty - fromY.get()) * p,
      width: hero.from.width + (tw - hero.from.width) * p,
      height: hero.from.height + (th - hero.from.height) * p,
    };
  });
  const photoStyle = useAnimatedStyle(() => ({ opacity: 1 - cover.get() }));

  // Each look opens over the last one, which stays alive underneath so the photo can
  // grow out of its tile. Under another look that has finished opening (it's no longer
  // on top), this page can't be seen at all, so it lets go of everything but its place:
  // kept whole, every look deeper in More like this held its photos in memory and made
  // each frame slower (250ms frames and ~60MB more a look, five deep on a Note10+).
  // Once the look above it is closed it's one below the top again, and rebuilds there,
  // out of sight, scrolled back to where she left it.
  const scrolledTo = useRef(0);
  const { key } = useRoute();
  const buried = useNavigationState(s => {
    const at = s.routes.findIndex(r => r.key === key);
    return at >= 0 && s.routes.length - at > 2 && s.routes[at + 1].name === 'looks/[id]';
  });

  return (
    <View
      ref={page}
      collapsable={false}
      style={[heroStyles.fill, buried && heroStyles.buried]}
      pointerEvents={buried ? 'none' : 'auto'}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }, backdrop]}
      />
      <Animated.View style={[heroStyles.fill, content]}>
        {buried ? null : look ? (
          <Screen back scroll="list" opaque={false} testID="look-screen">
            <LookThread
              id={id}
              settled={settled}
              photoRef={photo}
              onPhotoLayout={onPhotoLayout}
              // Hidden under the moving copy, so there's only ever one photo on screen.
              photoStyle={photoStyle}
              initialPhotoIndex={hero?.photoIndex}
              scrolledTo={scrolledTo}
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
  buried: { opacity: 0 },
  flight: { position: 'absolute', overflow: 'hidden', borderRadius: radius.lg },
});

/** Comments shown on the look itself; all of them are a tap away. */
const PREVIEW_COMMENTS = 2;

/**
 * The look, then the top of its conversation (all of it is a tap away, in a sheet),
 * then More like this: the same grid as home, loading as she scrolls, so one look
 * leads to the next, as Pinterest does under a pin.
 */
function LookThread({
  id,
  settled,
  photoRef,
  onPhotoLayout,
  photoStyle,
  initialPhotoIndex,
  scrolledTo,
}: {
  id: string;
  /** False while the page is still arriving: comments and More like this wait until it has. */
  settled: boolean;
  photoRef: RefObject<View | null>;
  onPhotoLayout: () => void;
  photoStyle: StyleProp<ViewStyle>;
  initialPhotoIndex?: number;
  /** Where she had scrolled to, kept by the page while this is let go (see LookScreen). */
  scrolledTo: RefObject<number>;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useContentInsets();
  const safe = useSafeAreaInsets();
  const onScroll = useScreenScrollHandler();
  const router = useRouter();
  const actions = useLookActions({ onItsOwnPage: true });
  const { isAuthenticated } = useAuth();
  const listRef = useRef<FlashListRef<Look>>(null);
  const [replyingTo, setReplyingTo] = useState<LookComment>();
  // Where the comments start, to bring a new one into view.
  const commentsAt = useRef(0);

  const { data: look } = useLook(id);
  usePrefetchStylistPage(settled ? look?.stylist?.handle : undefined);
  const thread = useComments(id);
  const related = useRelatedLooks(id, { enabled: settled });
  const focused = useIsFocused();
  // What's built, one step a frame once the photo has landed, so no single frame
  // carries the whole page: 1 the look's details, 2 the comment bar, 3 the comments
  // and More like this. Until then (0) only who posted it and the photo, which is all
  // the flight needs.
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!settled) return;
    let frame = 0;
    const next = () => {
      setStage(s => s + 1);
      if (++frame < 3) raf = requestAnimationFrame(next);
    };
    let raf = requestAnimationFrame(next);
    return () => cancelAnimationFrame(raf);
  }, [settled]);
  const preview = useMemo(
    () => (stage < 3 ? [] : (thread.data?.pages[0]?.data ?? []).slice(0, PREVIEW_COMMENTS)),
    [thread.data, stage]
  );
  const looks = useMemo(
    () => (stage < 3 ? [] : (related.data?.pages.flatMap(page => page.data) ?? [])),
    [related.data, stage]
  );
  const loadingMore = stage >= 3 && !related.data && related.isFetching;
  // What she sees and opens here is recorded like the feed, so it sinks next time.
  const tracking = useFeedTracking(
    related.data?.pages[0]?.session,
    'related',
    looks,
    actions.onOpen
  );
  const handlers = useCommentHandlers(id, setReplyingTo);

  // Remember her place when this is let go, and go back to it once it's built again.
  // A layout effect, so the list is still there to ask.
  useLayoutEffect(() => {
    const list = listRef.current;
    return () => {
      scrolledTo.current = list?.getAbsoluteLastScrollOffset() ?? 0;
    };
  }, [scrolledTo]);
  const { height: screenHeight } = useWindowDimensions();
  // Taken back as the grid fills in: until it's tall enough, the list can't go there yet.
  const [returnTo] = useState(() => scrolledTo.current);
  const restoring = useRef(returnTo > 0);
  const restore = (_w: number, height: number) => {
    if (!restoring.current) return;
    listRef.current?.scrollToOffset({ offset: returnTo, animated: false });
    if (height >= returnTo + screenHeight) restoring.current = false;
  };

  const renderItem = useCallback(
    ({ item }: { item: Look }) => (
      <LookTile
        look={item}
        onOpen={tracking.onOpen}
        onLike={actions.onLike}
        onSave={item.mine ? undefined : actions.onSave}
        onFindStylists={actions.onFindStylists}
      />
    ),
    [actions, tracking.onOpen]
  );

  const openComments = useCallback(() => router.push(`/looks/comments?id=${id}`), [router, id]);
  const showMore = looks.length > 0 || loadingMore;
  // Built once and kept while nothing in it changes, as home's header is: the page
  // updates as More like this loads, and rebuilding the look, its photos and its
  // comments then, mid-scroll, cost frames.
  const header = useMemo(() => {
    if (!look) return null;
    const count = look.commentCount;
    return (
      <View style={styles.header}>
        <LookCard
          look={look}
          detail
          {...actions}
          onOpen={undefined}
          onSave={look.mine ? undefined : actions.onSave}
          photoRef={photoRef}
          onPhotoLayout={onPhotoLayout}
          photoStyle={photoStyle}
          details={stage >= 1}
          initialPhotoIndex={initialPhotoIndex}
        />
        {stage >= 2 && !!look.styles[0] && (
          <WhoDoesThis
            style={look.styles[0]}
            name={actions.styleNames[look.styles[0]]}
            lookId={look.id}
          />
        )}
        {stage >= 1 && (
          <Animated.View
            entering={FadeIn.duration(180)}
            onLayout={e => (commentsAt.current = e.nativeEvent.layout.y)}
          >
            <PressableScale
              onPress={openComments}
              scaleTo={1}
              accessibilityRole="button"
              accessibilityLabel={count ? `All ${count} comments` : 'Comments'}
              style={styles.commentsHead}
              testID="look-comments-open"
            >
              <Text variant="overline" tone="tertiary">
                {count ? `${count} ${count === 1 ? 'comment' : 'comments'}` : 'Comments'}
              </Text>
              {count > 0 && <ChevronRight size={16} color={theme.colors.text.tertiary} />}
            </PressableScale>
            {/* Only for a real wait: a shimmer running under the flight costs frames. */}
            {thread.isLoading && <Skeleton height={60} />}
            {preview.map(comment => (
              <Thread key={comment.id} lookId={id} comment={comment} {...handlers} />
            ))}
            {stage >= 3 && !thread.isLoading && !preview.length && (
              <Text variant="subhead" tone="secondary">
                No comments yet. Say what you love about it.
              </Text>
            )}
            {count > preview.length && preview.length > 0 && (
              <Text
                variant="subhead"
                tone="secondary"
                onPress={openComments}
                accessibilityRole="button"
                style={styles.viewAll}
                suppressHighlighting
              >
                View all {count} comments
              </Text>
            )}
          </Animated.View>
        )}
        {showMore && (
          <Text variant="title3" accessibilityRole="header" style={styles.moreHead}>
            More like this
          </Text>
        )}
        {/* Still on its way: the grid's shape, as on home, rather than nothing. */}
        {loadingMore && <LooksSkeleton />}
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    look,
    styles,
    theme,
    actions,
    photoRef,
    onPhotoLayout,
    photoStyle,
    stage,
    initialPhotoIndex,
    thread.isLoading,
    preview,
    handlers.onReply,
    handlers.onOptions,
    handlers.onLike,
    id,
    openComments,
    showMore,
    loadingMore,
  ]);

  if (!look) return null;

  return (
    <View style={styles.fill}>
      <AnimatedFlashList
        ref={listRef}
        data={looks}
        masonry
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        onViewableItemsChanged={tracking.onViewableItemsChanged}
        viewabilityConfig={tracking.viewabilityConfig}
        ListHeaderComponent={header}
        ListFooterComponent={<LooksFooter loading={related.isFetchingNextPage} />}
        onEndReached={() => {
          // A screen covered by another reports it's at the end; only the visible one loads more.
          if (settled && focused && related.hasNextPage && !related.isFetchingNextPage) {
            related.fetchNextPage();
          }
        }}
        onContentSizeChange={restore}
        // Once she scrolls herself, she's the one deciding where to be.
        onScrollBeginDrag={() => (restoring.current = false)}
        onEndReachedThreshold={FEED_LIST.onEndReachedThreshold}
        drawDistance={FEED_LIST.drawDistance}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: space.xl,
          paddingHorizontal: GUTTER - CARD_INSET,
        }}
      />
      {stage < 2 ? null : !isAuthenticated ? (
        // Anyone can read the conversation; joining it takes an account.
        <Animated.View
          entering={FadeIn.duration(180)}
          style={[styles.composer, { paddingBottom: safe.bottom + space.sm }]}
        >
          <Button
            label="Sign in to comment"
            variant="secondary"
            onPress={() => router.push('/auth/join')}
            fullWidth
          />
        </Animated.View>
      ) : (
        <KeyboardStickyView offset={{ closed: 0, opened: safe.bottom }}>
          <Animated.View entering={FadeIn.duration(180)}>
            <Composer
              lookId={id}
              bottom={safe.bottom + space.sm}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(undefined)}
              onSent={reply => {
                setReplyingTo(undefined);
                // A new comment shows at the top of the conversation: bring it into view.
                if (!reply) {
                  listRef.current?.scrollToOffset({ offset: commentsAt.current, animated: true });
                }
              }}
            />
          </Animated.View>
        </KeyboardStickyView>
      )}
    </View>
  );
}

/**
 * Under a look: who does its style, and what it starts at. Asked for only once the
 * look has settled, so the opening flight never waits on it.
 */
function WhoDoesThis({ style, name, lookId }: { style: string; name?: string; lookId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const { data: account } = useUser(user?.id);
  const near = !!(account?.hairProfile?.area || account?.hairProfile?.postcode);
  // The same question the list asks first, so opening it is instant.
  const { data: stylists = [] } = useStylistsForStyle(style, { within: near ? 10 : undefined });
  if (!stylists.length || !name) return null;
  const prices = stylists.map(s => s.fromPrice).filter((p): p is number => !!p);
  // A lowest price only means something in one currency; mixed, it's left out.
  const currencies = new Set(stylists.map(s => s.currency ?? DEFAULT_CURRENCY));
  const currency = currencies.size === 1 ? [...currencies][0] : undefined;
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ marginBottom: space.xl }}>
      <PressableScale
        onPress={() => router.push(`/who/${style}?look=${lookId}`)}
        accessibilityRole="button"
        accessibilityLabel={`Who does ${name}: ${stylists.length} stylists`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          padding: space.md,
          borderRadius: radius.lg,
          backgroundColor: theme.colors.glass.fill,
          borderWidth: 1,
          borderColor: theme.colors.glass.border,
        }}
        testID="who-does-this-card"
      >
        <View style={{ flexDirection: 'row' }}>
          {stylists.slice(0, 3).map((s, i) => (
            <View key={s.accountId} style={{ marginLeft: i ? -12 : 0 }}>
              <Avatar uri={s.photoUri ?? s.avatarUri} name={s.displayName} size={36} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="callout">Who does {name.toLowerCase()}?</Text>
          <Text variant="footnote" tone="secondary">
            {stylists.length} {stylists.length === 1 ? 'stylist' : 'stylists'}
            {near ? ' near you' : ''}
            {prices.length && currency
              ? `${SEP}from ${formatMoney(Math.min(...prices), currency)}`
              : ''}
          </Text>
        </View>
        <ChevronRight size={18} color={theme.colors.text.tertiary} />
      </PressableScale>
    </Animated.View>
  );
}
