import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
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
import { formatMoney } from '@/shared/lib/format';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { bookable, postedLabel } from '../format';
import type { Look } from '../types';
import { LikeButton } from './LikeButton';
import { usePhotoTaps } from './usePhotoTaps';

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
  onSave,
  onShare,
  onBook,
  onMore,
}: LookCardProps) {
  const styles = useStyles();
  const theme = useTheme();
  const price = look.price
    ? `${look.fromPrice ? 'from ' : ''}${formatMoney(look.price)}`
    : undefined;

  const { gesture: photoGesture, heart } = usePhotoTaps(look, onOpen, onLike);
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
            {heart}
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
        {/* How many people saved it — and a filled mark if you're one of them. */}
        {look.visibility !== 'private' && (
          <PressableScale
            onPress={onSave ? () => onSave(look) : undefined}
            disabled={!onSave}
            scaleTo={0.92}
            accessibilityLabel={`Saved by ${look.saveCount ?? 0} ${look.saveCount === 1 ? 'person' : 'people'}${onSave ? '. Save to a collection' : ''}`}
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
});
