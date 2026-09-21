import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  BookmarkPlus,
  CalendarPlus,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share,
} from 'lucide-react-native';
import { TEXTURE_LABELS } from '@/features/profile';
import { formatMoney } from '@/shared/lib/format';
import { haptics } from '@/shared/lib/haptics';
import { EASE_OUT, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { bookable, postedLabel } from '../format';
import type { Look } from '../types';
import { LikeButton } from './LikeButton';

/** Two taps closer together than this are one double tap. */
const DOUBLE_TAP_MS = 280;

/** "Coily hair", but "Zig-zag coils" — the word hair only where it reads. */
const hairLabel = (label: string) => (/coils$/i.test(label) ? label : `${label} hair`);

export interface LookCardProps {
  look: Look;
  /** Style names by id, from the taxonomy. */
  styleNames?: Record<string, string>;
  /** On the look's own page the caption isn't cut short and the photo doesn't open anything. */
  detail?: boolean;
  onOpen?: (look: Look) => void;
  /** Opens a person's page — the author's, or the stylist she tagged. */
  onOpenPerson?: (handle: string) => void;
  onLike: (look: Look, liked: boolean) => void;
  /** Saves it into a collection. Absent for your own looks. */
  onSave?: (look: Look) => void;
  onShare: (look: Look) => void;
  onBook?: (look: Look) => void;
  onMore: (look: Look) => void;
}

const useStyles = makeStyles(t => ({
  card: { gap: space.sm, marginBottom: space.xxl },
  author: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  names: { flex: 1 },
  media: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    aspectRatio: 0.8,
    backgroundColor: t.colors.glass.fillStrong,
  },
  burst: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  service: {
    position: 'absolute',
    left: space.sm,
    bottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 1,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,8,10,0.55)',
  },
  serviceText: { color: '#FFFFFF' },
  save: { position: 'absolute', right: space.sm, bottom: space.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 36 },
  spacer: { flex: 1 },
  book: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 34,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: t.colors.accentSoft,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
}));

/**
 * One look: whose work it is, the picture, and what it costs. A double tap on the
 * photo likes it, the way people expect; a single tap opens it.
 */
export function LookCard({
  look,
  styleNames,
  detail,
  onOpen,
  onOpenPerson,
  onLike,
  onSave,
  onShare,
  onBook,
  onMore,
}: LookCardProps) {
  const styles = useStyles();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const price = look.price
    ? `${look.fromPrice ? 'from ' : ''}${formatMoney(look.price)}`
    : undefined;

  // The big heart over the photo. Runs on the UI thread; the like itself is a
  // single call back to React when the gesture ends.
  const burstScale = useSharedValue(0.6);
  const burstOpacity = useSharedValue(0);
  const burst = useAnimatedStyle(() => ({
    opacity: burstOpacity.get(),
    transform: [{ scale: burstScale.get() }],
  }));

  // One tap opens the look, two like it. The first tap waits a beat to see if a
  // second follows — the same wait a double-tap recogniser has, written out so it
  // behaves identically on every platform.
  const pendingOpen = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTapAt = useRef(0);
  useEffect(() => () => clearTimeout(pendingOpen.current), []);

  const burstHeart = () => {
    if (!reduced) {
      burstScale.set(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withSpring(1, { duration: 380, dampingRatio: 0.55 }),
          withTiming(1.1, { duration: 220, easing: EASE_OUT })
        )
      );
    }
    burstOpacity.set(
      withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(1, { duration: 420 }),
        withTiming(0, { duration: 200, easing: EASE_OUT })
      )
    );
  };

  const onPhotoTap = () => {
    const now = Date.now();
    if (now - lastTapAt.current < DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      clearTimeout(pendingOpen.current);
      burstHeart();
      haptics.light();
      // A double tap only ever likes. Taking a like back is a deliberate tap on the heart.
      if (!look.liked) onLike(look, true);
      return;
    }
    lastTapAt.current = now;
    if (onOpen) pendingOpen.current = setTimeout(() => onOpen(look), DOUBLE_TAP_MS);
  };

  const photoGesture = Gesture.Tap().onEnd((_e, success) => {
    if (success) scheduleOnRN(onPhotoTap);
  });
  const open = () => onOpen?.(look);

  const author = (
    <>
      <Avatar uri={look.authorAvatarUri} name={look.authorName} size={36} />
      <View style={styles.names}>
        <Text variant="callout" numberOfLines={1}>
          {look.authorName}
        </Text>
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {[look.authorHandle && `@${look.authorHandle}`, look.area, postedLabel(look.createdAt)]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </>
  );

  // A client's look credits the stylist who did it; a stylist's own look already does.
  const credit = look.stylist && look.stylist.id !== look.authorId ? look.stylist : undefined;
  const tags = [
    ...look.styles.map(id => styleNames?.[id]).filter(Boolean),
    look.hairTexture && hairLabel(TEXTURE_LABELS[look.hairTexture]),
  ].filter(Boolean) as string[];

  return (
    <View style={styles.card}>
      <View style={styles.author}>
        {/* A name with nowhere to go is a name, not a disabled button — a screen
            reader shouldn't offer it. */}
        {look.authorHandle && onOpenPerson ? (
          <PressableScale
            onPress={() => onOpenPerson(look.authorHandle!)}
            accessibilityLabel={`${look.authorName}, open their page`}
            containerStyle={styles.author}
          >
            {author}
          </PressableScale>
        ) : (
          <View style={styles.author}>{author}</View>
        )}
        <IconButton
          icon={MoreHorizontal}
          variant="plain"
          size={36}
          accessibilityLabel={`Options for ${look.authorName}'s look`}
          onPress={() => onMore(look)}
        />
      </View>

      <View style={styles.media}>
        {/* Only the photo takes the taps: the buttons over it are siblings, so pressing
            one can never open or like the look as well. */}
        <GestureDetector gesture={photoGesture}>
          <View
            style={StyleSheet.absoluteFill}
            accessible
            accessibilityRole={detail ? 'image' : 'button'}
            accessibilityLabel={look.caption ?? look.serviceName ?? 'A look'}
            accessibilityHint={detail ? 'Double tap to like' : 'Opens the look. Double tap to like'}
          >
            <RemoteImage
              uri={look.photoUri}
              style={StyleSheet.absoluteFill}
              recyclingKey={look.id}
            />
            <Animated.View pointerEvents="none" style={[styles.burst, burst]}>
              <Heart size={96} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.2} />
            </Animated.View>
          </View>
        </GestureDetector>
        {onSave && (
          <IconButton
            icon={BookmarkPlus}
            variant="overlay"
            size={32}
            accessibilityLabel="Save to a collection"
            onPress={() => onSave(look)}
            style={styles.save}
          />
        )}
        {!!look.serviceName && (
          <View style={styles.service} pointerEvents="none">
            <Text variant="footnote" style={styles.serviceText} numberOfLines={1}>
              {look.serviceName}
            </Text>
            {!!price && (
              <Text variant="footnote" style={styles.serviceText}>
                · {price}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <LikeButton
          id={look.id}
          liked={look.liked}
          count={look.likeCount}
          onToggle={() => onLike(look, !look.liked)}
        />
        <PressableScale
          onPress={open}
          disabled={detail}
          scaleTo={0.92}
          accessibilityLabel={`${look.commentCount} ${look.commentCount === 1 ? 'comment' : 'comments'}`}
          style={styles.action}
        >
          <MessageCircle size={21} color={theme.colors.text.secondary} strokeWidth={2} />
          {look.commentCount > 0 && (
            <Text variant="callout" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
              {look.commentCount}
            </Text>
          )}
        </PressableScale>
        <PressableScale
          onPress={() => onShare(look)}
          scaleTo={0.92}
          accessibilityLabel="Share"
          style={styles.action}
        >
          <Share size={20} color={theme.colors.text.secondary} strokeWidth={2} />
        </PressableScale>
        <View style={styles.spacer} />
        {onBook && bookable(look) && (
          <PressableScale
            onPress={() => onBook(look)}
            haptic="light"
            accessibilityLabel={`Book this look with ${look.stylist!.name}`}
            style={styles.book}
            testID={`look-book-${look.id}`}
          >
            <CalendarPlus size={15} color={theme.colors.accent} strokeWidth={2.2} />
            <Text variant="callout" tone="accent">
              Book this look
            </Text>
          </PressableScale>
        )}
      </View>

      {!!look.caption && (
        <Text variant="subhead" tone="secondary" numberOfLines={detail ? undefined : 3}>
          {look.caption}
        </Text>
      )}

      {(credit || tags.length > 0) && (
        <View style={styles.tags}>
          {credit && (
            <Text
              variant="caption"
              tone={credit.handle ? 'accent' : 'tertiary'}
              onPress={
                credit.handle && onOpenPerson ? () => onOpenPerson(credit.handle!) : undefined
              }
              accessibilityRole={credit.handle ? 'link' : undefined}
            >
              Hair by {credit.name}
              {tags.length ? ' · ' : ''}
            </Text>
          )}
          {tags.length > 0 && (
            <Text variant="caption" tone="tertiary">
              {tags.join(' · ')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
