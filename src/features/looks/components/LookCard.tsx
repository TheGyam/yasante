import { StyleSheet, View } from 'react-native';
import { BookmarkPlus, MoreHorizontal } from 'lucide-react-native';
import { formatMoney } from '@/shared/lib/format';
import { makeStyles, radius, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import type { Look } from '../types';

export interface LookCardProps {
  look: Look;
  /** Opens the author's page. Absent when she hasn't published one. */
  onOpenAuthor?: (look: Look) => void;
  /** Saves it into a collection. Absent for your own looks. */
  onSave?: (look: Look) => void;
  onMore: (look: Look) => void;
}

const useStyles = makeStyles(() => ({
  card: { gap: space.sm, marginBottom: space.xxl },
  author: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  names: { flex: 1 },
  media: { overflow: 'hidden', borderRadius: radius.lg, aspectRatio: 0.8 },
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
}));

/** One look in the feed: whose work it is, the picture, and what it costs. */
export function LookCard({ look, onOpenAuthor, onSave, onMore }: LookCardProps) {
  const styles = useStyles();
  const price = look.price
    ? `${look.fromPrice ? 'from ' : ''}${formatMoney(look.price)}`
    : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.author}>
        <PressableScale
          onPress={() => onOpenAuthor?.(look)}
          disabled={!onOpenAuthor}
          accessibilityLabel={`${look.authorName}, open their page`}
          containerStyle={styles.author}
        >
          <Avatar uri={look.authorAvatarUri} name={look.authorName} size={36} />
          <View style={styles.names}>
            <Text variant="callout" numberOfLines={1}>
              {look.authorName}
            </Text>
            {!!look.authorHandle && (
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                @{look.authorHandle}
              </Text>
            )}
          </View>
        </PressableScale>
        <IconButton
          icon={MoreHorizontal}
          variant="plain"
          size={36}
          accessibilityLabel={`Options for ${look.authorName}'s look`}
          onPress={() => onMore(look)}
        />
      </View>

      <View style={styles.media}>
        <RemoteImage
          uri={look.photoUri}
          style={StyleSheet.absoluteFill}
          recyclingKey={look.id}
          accessibilityLabel={look.caption ?? look.serviceName ?? 'A look'}
        />
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
          <View style={styles.service}>
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

      {!!look.caption && (
        <Text variant="subhead" tone="secondary" numberOfLines={3}>
          {look.caption}
        </Text>
      )}
    </View>
  );
}
