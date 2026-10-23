import { useEffect } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { formatDistanceToNowStrict } from 'date-fns';
import { Check, Flag, Plus, Share as ShareIcon } from 'lucide-react-native';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { SEP } from '@/shared/lib/format';
import { fonts, makeStyles, radius, space, timing, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import type { SharedAuthor } from '../types';

const useStyles = makeStyles(t => ({
  author: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  authorText: { flex: 1 },
  mosaic: {
    height: 232,
    flexDirection: 'row',
    gap: 3,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: t.colors.glass.fillStrong,
  },
  mosaicSide: { flex: 1, gap: 3 },
  tile: { flex: 1, backgroundColor: t.colors.glass.fillStrong },
  // The app's standard button height, so it sits level with "Make it yours".
  follow: {
    minHeight: 56,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.xl,
    borderWidth: 1,
  },
  followLabel: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
}));

/** "Updated 2 days ago" */
export const updatedLabel = (iso: string) =>
  `Updated ${formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}`;

/**
 * Who made it: her photo, name and @username, and an optional line after. All that
 * anyone else ever sees of her.
 */
export function AuthorLine({
  author,
  detail,
  title,
  size = 36,
}: {
  author: SharedAuthor;
  detail?: string;
  /** In place of her name, as in "Steps by Ama Owusu"; the @username is left out then. */
  title?: string;
  size?: number;
}) {
  const styles = useStyles();
  return (
    <View
      style={styles.author}
      accessible
      accessibilityLabel={`By ${author.name}${detail ? `. ${detail}` : ''}`}
    >
      <Avatar uri={author.avatarUri} name={author.name} size={size} />
      <View style={styles.authorText}>
        <Text variant="callout" numberOfLines={1}>
          {title ?? author.name}
        </Text>
        <Text variant="footnote" tone="secondary" numberOfLines={1}>
          {[!title && author.username && `@${author.username}`, detail].filter(Boolean).join(SEP)}
        </Text>
      </View>
    </View>
  );
}

/**
 * The first few pictures as one cover: one large on the left and two stacked on the
 * right, as Pinterest shows a board. Fewer pictures fill the space they have.
 */
export function Mosaic({ uris, recyclingKey }: { uris: string[]; recyclingKey: string }) {
  const styles = useStyles();
  const [first, second, third] = uris;
  const tile = (uri: string | undefined, i: number) =>
    uri ? (
      <RemoteImage key={i} uri={uri} style={styles.tile} recyclingKey={`${recyclingKey}-${i}`} />
    ) : (
      <View key={i} style={styles.tile} />
    );
  return (
    <View
      style={styles.mosaic}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ flex: 2 }}>{tile(first, 0)}</View>
      {(second || third) && (
        <View style={styles.mosaicSide}>
          {tile(second, 1)}
          {third ? tile(third, 2) : null}
        </View>
      )}
    </View>
  );
}

/**
 * Tag along, and once tagging along, "Tagging along" with a tick. The fill eases from the
 * accent to glass, the label cross-fades and the tick pops in: a change of state,
 * not a new button.
 */
export function FollowButton({
  following,
  onPress,
  loading,
  testID,
}: {
  following: boolean;
  onPress: () => void;
  loading?: boolean;
  testID?: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const on = useSharedValue(following ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(following ? 1 : 0, { ...timing.state, duration: 220 }));
  }, [following, on]);
  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      on.get(),
      [0, 1],
      [theme.colors.accent, theme.colors.glass.fill]
    ),
    borderColor: interpolateColor(
      on.get(),
      [0, 1],
      [theme.colors.accent, theme.colors.glass.border]
    ),
  }));
  const color = following ? theme.colors.text.primary : theme.colors.text.onAccent;

  return (
    <PressableScale
      onPress={() => {
        haptics.light();
        onPress();
      }}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ selected: following, busy: loading }}
      accessibilityLabel={following ? 'Tagging along. Options' : 'Tag along'}
      containerStyle={{ flex: 1 }}
      testID={testID}
    >
      <Animated.View style={[styles.follow, fill]} layout={LinearTransition.duration(220)}>
        {following ? (
          <Animated.View key="tick" entering={ZoomIn.springify().damping(14)}>
            <Check size={17} color={color} strokeWidth={2.6} />
          </Animated.View>
        ) : (
          <Animated.View key="plus" entering={FadeIn.duration(150)}>
            <Plus size={17} color={color} strokeWidth={2.6} />
          </Animated.View>
        )}
        <Animated.Text
          key={following ? 'following' : 'follow'}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={[styles.followLabel, { color }]}
        >
          {following ? 'Tagging along' : 'Tag along'}
        </Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

/**
 * In the header of someone else's shared collection or plan: send the link on, or
 * report it. Reporting needs an account, so `signedIn` asks for one first.
 */
export function SharedHeaderActions({
  kind,
  code,
  name,
  author,
  signedIn,
}: {
  kind: 'collection' | 'care-plan';
  code: string;
  name: string;
  author: SharedAuthor;
  signedIn: (then: () => void) => () => void;
}) {
  const router = useRouter();
  const url = `https://yasante.com/${kind === 'collection' ? 'c' : 'p'}/${code}`;
  const report = () =>
    router.push(
      `/looks/options?kind=${kind}&id=${encodeURIComponent(code)}&name=${encodeURIComponent(
        author.name
      )}&authorId=${author.id ?? ''}&mine=0&leave=1`
    );
  return (
    <View style={sharedStyles.header}>
      <IconButton
        icon={ShareIcon}
        size={36}
        accessibilityLabel="Share"
        onPress={() =>
          Share.share({ message: `${name} by ${author.name} on Yasante: ${url}`, url }).catch(
            () => {}
          )
        }
      />
      <IconButton
        icon={Flag}
        size={36}
        accessibilityLabel="Report"
        onPress={signedIn(report)}
        testID="shared-report"
      />
    </View>
  );
}

export const sharedStyles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.sm },
  header: { flexDirection: 'row', gap: space.xs },
});
