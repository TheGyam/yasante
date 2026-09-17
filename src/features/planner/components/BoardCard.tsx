import { StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { Check, ImageIcon, Lock } from 'lucide-react-native';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { appointmentOf } from '../format';
import type { MoodBoardEntry } from '../types';

export interface BoardCardProps {
  entry: MoodBoardEntry;
  onPress: (entry: MoodBoardEntry) => void;
}

const useStyles = makeStyles(t => ({
  card: { flex: 1, gap: space.sm },
  media: {
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: t.colors.glass.fillStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    flexDirection: 'row',
    gap: space.xs,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,8,10,0.5)',
  },
  done: { backgroundColor: t.colors.success },
  text: { gap: 2, paddingHorizontal: space.xxs },
}));

export function BoardCard({ entry, onPress }: BoardCardProps) {
  const styles = useStyles();
  const theme = useTheme();
  const when = appointmentOf(entry);
  const cover = entry.mainPhotoUri || entry.photos?.[0];
  const meta = entry.completed
    ? 'Done'
    : when
      ? format(when, 'EEE d MMM · HH:mm')
      : 'No appointment yet';

  return (
    <PressableScale
      onPress={() => onPress(entry)}
      scaleTo={0.98}
      accessibilityLabel={`${entry.name}, ${meta}`}
      containerStyle={styles.card}
      style={styles.card}
    >
      <View style={styles.media}>
        {cover ? (
          <RemoteImage uri={cover} style={StyleSheet.absoluteFill} recyclingKey={entry.id} />
        ) : (
          <ImageIcon size={28} color={theme.colors.text.tertiary} strokeWidth={1.8} />
        )}
        <View style={styles.badges}>
          {entry.isSecret && (
            <View style={styles.badge}>
              <Lock size={13} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          )}
          {entry.completed && (
            <View style={[styles.badge, styles.done]}>
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
        </View>
      </View>
      <View style={styles.text}>
        <Text variant="callout" numberOfLines={1}>
          {entry.name}
        </Text>
        <Text variant="footnote" tone="secondary" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </PressableScale>
  );
}
