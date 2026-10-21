import { memo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space } from '@/shared/theme';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { openWithHero } from '../heroTransition';
import { useRelatedLooks } from '../hooks';
import type { Look } from '../types';

const useStyles = makeStyles(() => ({
  section: { gap: space.sm, paddingTop: space.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  cell: { width: '32.5%' },
  thumb: { aspectRatio: 0.8, borderRadius: radius.md, overflow: 'hidden' },
}));

/** Under a look: looks the same people saved, in the same styles, by the same person. */
export function MoreLikeThis({ lookId }: { lookId: string }) {
  const styles = useStyles();
  const router = useRouter();
  const { data: looks = [] } = useRelatedLooks(lookId);
  if (!looks.length) return null;
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="tertiary">
        More like this
      </Text>
      <View style={styles.grid}>
        {looks.map(look => (
          <View key={look.id} style={styles.cell}>
            <Thumb look={look} onOpen={() => router.push(`/looks/${look.id}`)} />
          </View>
        ))}
      </View>
    </View>
  );
}

const Thumb = memo(function Thumb({ look, onOpen }: { look: Look; onOpen: () => void }) {
  const styles = useStyles();
  const photo = useRef<View>(null);
  return (
    <PressableScale
      accessibilityLabel={look.caption || look.serviceName || `A look by ${look.authorName}`}
      onPress={() =>
        openWithHero(
          photo.current,
          { lookId: look.id, uri: look.thumbUri ?? look.photoUri },
          onOpen
        )
      }
    >
      <View ref={photo} style={styles.thumb}>
        <RemoteImage
          uri={look.thumbUri ?? look.photoUri}
          style={StyleSheet.absoluteFill}
          recyclingKey={look.id}
        />
      </View>
    </PressableScale>
  );
});
