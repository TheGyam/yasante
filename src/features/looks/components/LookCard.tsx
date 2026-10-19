import { memo, useCallback, useRef, useState, type RefObject } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Bookmark,
  BookmarkPlus,
  CalendarPlus,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Share,
} from 'lucide-react-native';
import { TEXTURE_LABELS } from '@/features/profile';
import { DEFAULT_CURRENCY, formatMoney, SEP } from '@/shared/lib/format';
import { HIT_TARGET, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';
import { bookable, postedLabel } from '../format';
import { openWithHero } from '../heroTransition';
import { lookPhotos, type Look } from '../types';
import { LikeButton } from './LikeButton';
import { LookPhotos } from './LookPhotos';

/** "Coily hair", "Kinky (4C) hair"; a label already ending in coils keeps it. */
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
  /** Press and hold the photo: who does this style. */
  onFindStylists?: (look: Look) => void;
  /** Saves it into a collection. Absent for your own looks. */
  onSave?: (look: Look) => void;
  onShare: (look: Look) => void;
  onBook?: (look: Look) => void;
  onMore: (look: Look) => void;
  /** On the look's own page: where the photo lands, for the opening animation. */
  photoRef?: RefObject<View | null>;
  onPhotoLayout?: () => void;
  /**
   * On the look's own page: an animated style that hides the photo while the opening
   * animation's copy sits on top of it. Animated rather than a prop, so opening and
   * closing never re-render the page.
   */
  photoStyle?: StyleProp<ViewStyle>;
  /**
   * False keeps it to who posted it and the photo: all the look's page needs while
   * the photo flies in. What goes below the photo fades in once this turns true.
   */
  details?: boolean;
  /** On the look's own page: which photo to open already swiped to. */
  initialPhotoIndex?: number;
}

const useStyles = makeStyles(t => ({
  card: { gap: space.sm, marginBottom: space.xxl },
  below: { gap: space.sm },
  author: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // Takes the row's spare width, so the options button always has its place at the end.
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  names: { flex: 1 },
  media: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    aspectRatio: 0.8,
    backgroundColor: t.colors.glass.fillStrong,
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
  // 44 square at least: a thumb, not a fingertip (the icons are 20).
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
  },
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
  private: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
}));

/**
 * One look: whose work it is, the picture, and what it costs. A double tap on the
 * photo likes it, the way people expect; a single tap opens it.
 */
export const LookCard = memo(function LookCard({
  look,
  styleNames,
  detail,
  onOpen,
  onOpenPerson,
  onLike,
  onFindStylists,
  onSave,
  onShare,
  onBook,
  onMore,
  photoRef,
  onPhotoLayout,
  photoStyle,
  details = true,
  initialPhotoIndex,
}: LookCardProps) {
  const styles = useStyles();
  const theme = useTheme();
  // A featured stylist isn't taking bookings yet: "Featured" stands where a price would.
  const price = look.stylistFeatured
    ? 'Featured'
    : look.price
      ? `${look.fromPrice ? 'from ' : ''}${formatMoney(look.price, look.currency ?? DEFAULT_CURRENCY)}`
      : undefined;

  // In a feed the photo grows out of this card into the look's page.
  const ownPhoto = useRef<View>(null);
  const media = photoRef ?? ownPhoto;
  const openFromHere = useCallback(
    (l: Look, photoIndex: number) => {
      if (!onOpen) return;
      const photo = lookPhotos(l)[photoIndex] ?? lookPhotos(l)[0];
      openWithHero(
        media.current,
        { lookId: l.id, uri: photo.thumbUri ?? photo.uri, photoIndex },
        () => onOpen(l)
      );
    },
    [onOpen, media]
  );
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
            .join(SEP)}
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

  // Whether it opened without its details: if so they fade in when they arrive,
  // rather than appear in a single frame.
  const [startedBare] = useState(!details);
  const below = (
    <>
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
        {/* How many people saved it — and a filled mark if you're one of them. */}
        {look.visibility !== 'private' && (
          <PressableScale
            onPress={onSave ? () => onSave(look) : undefined}
            disabled={!onSave}
            scaleTo={0.92}
            accessibilityLabel={`Saved by ${look.saveCount ?? 0} ${look.saveCount === 1 ? 'person' : 'people'}${look.saved ? '. You saved it' : ''}${onSave ? '. Save to a collection' : ''}`}
            style={styles.action}
          >
            <Bookmark
              size={20}
              color={look.saved ? theme.colors.accent : theme.colors.text.secondary}
              fill={look.saved ? theme.colors.accent : 'transparent'}
              strokeWidth={2}
            />
            {!!look.saveCount && (
              <Text
                variant="callout"
                style={{
                  color: look.saved ? theme.colors.accent : theme.colors.text.secondary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {look.saveCount}
              </Text>
            )}
          </PressableScale>
        )}
        {/* A private look has nobody to share with. */}
        {look.visibility !== 'private' && (
          <PressableScale
            onPress={() => onShare(look)}
            scaleTo={0.92}
            accessibilityLabel="Share"
            style={styles.action}
          >
            <Share size={20} color={theme.colors.text.secondary} strokeWidth={2} />
          </PressableScale>
        )}
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

      {!!look.products?.length && (
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          Used {look.products.map(p => `${p.brand} ${p.name}`).join(', ')}
        </Text>
      )}

      {look.visibility === 'private' && (
        <View style={styles.private}>
          <Lock size={12} color={theme.colors.text.tertiary} strokeWidth={2.2} />
          <Text variant="caption" tone="tertiary">
            Only you can see this
          </Text>
        </View>
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
              {tags.length ? SEP : ''}
            </Text>
          )}
          {tags.length > 0 && (
            <Text variant="caption" tone="tertiary">
              {tags.join(SEP)}
            </Text>
          )}
        </View>
      )}
    </>
  );

  return (
    <View style={styles.card}>
      <View style={styles.author}>
        {/* A name with nowhere to go is a name, not a disabled button — a screen
            reader shouldn't offer it. */}
        {look.authorHandle && onOpenPerson ? (
          <PressableScale
            onPress={() => onOpenPerson(look.authorHandle!)}
            accessibilityLabel={`${look.authorName}, open their page`}
            containerStyle={styles.who}
          >
            {author}
          </PressableScale>
        ) : (
          <View style={styles.who}>{author}</View>
        )}
        <IconButton
          icon={MoreHorizontal}
          variant="plain"
          size={36}
          accessibilityLabel={`Options for ${look.authorName}'s look`}
          onPress={() => onMore(look)}
        />
      </View>

      {/* The measured box stays a plain view (every platform can measure it); the
          animated hide wraps it. */}
      <Animated.View style={photoStyle}>
        <View ref={media} style={styles.media} onLayout={onPhotoLayout}>
          {/* Only the photo takes the taps: the buttons over it are siblings, so pressing
            one can never open or like the look as well. */}
          <LookPhotos
            look={look}
            detail={detail}
            onOpen={onOpen && openFromHere}
            onLike={onLike}
            onFindStylists={look.styles.length ? onFindStylists : undefined}
            initialIndex={initialPhotoIndex}
          />
          {onSave && (
            <IconButton
              icon={look.saved ? Bookmark : BookmarkPlus}
              variant={look.saved ? 'accent' : 'overlay'}
              size={32}
              accessibilityLabel={
                look.saved ? 'Saved. Save to another collection' : 'Save to a collection'
              }
              onPress={() => onSave(look)}
              style={styles.save}
            />
          )}
          {(!!look.serviceName || !!look.stylistFeatured) && (
            <View style={styles.service} pointerEvents="none">
              {!!look.serviceName && (
                <Text variant="footnote" style={styles.serviceText} numberOfLines={1}>
                  {look.serviceName}
                </Text>
              )}
              {!!price && (
                <Text variant="footnote" style={styles.serviceText}>
                  {look.serviceName ? `${SEP}${price}` : price}
                </Text>
              )}
            </View>
          )}
        </View>
      </Animated.View>

      {details &&
        (startedBare ? (
          <Animated.View entering={FadeIn.duration(180)} style={styles.below}>
            {below}
          </Animated.View>
        ) : (
          below
        ))}
    </View>
  );
});
