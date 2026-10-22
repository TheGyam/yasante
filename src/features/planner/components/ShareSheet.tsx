import { Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { Check, Droplets, Link2, Lock, Share as ShareIcon, Users } from 'lucide-react-native';
import { haptics } from '@/shared/lib/haptics';
import { track } from '@/shared/lib/analytics';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm } from '@/shared/ui/dialog';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';
import { shareCounts } from '../format';
import type { ShareState, Sharing } from '../types';

const useStyles = makeStyles(t => ({
  body: { gap: space.lg, paddingBottom: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headText: { flex: 1, gap: 2 },
  thumbs: { width: 56, height: 56 },
  thumb: {
    position: 'absolute',
    width: 40,
    height: 50,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: t.colors.glass.chromeSolid,
    backgroundColor: t.colors.glass.fillStrong,
  },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  options: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    backgroundColor: t.colors.glass.fill,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 64,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.colors.separator,
    marginLeft: 60,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.glass.fillStrong,
  },
  optionIconOn: { backgroundColor: t.colors.accentSoft },
  optionText: { flex: 1, gap: 1 },
  tick: { width: 24, alignItems: 'center' },
  shared: { gap: space.md },
  stats: { flexDirection: 'row', alignItems: 'center', gap: space.xs, justifyContent: 'center' },
}));

export interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  kind: 'collection' | 'care-plan';
  name: string;
  /** "14 looks", "5 steps". */
  detail: string;
  previewUris?: string[];
  state: ShareState;
  onChange: (sharing: Sharing) => Promise<unknown>;
  busy?: boolean;
}

/**
 * Who can see it: only her, or anyone with the link. Sharing is off until she
 * chooses, and stopping kills the link at once.
 */
export function ShareSheet({
  visible,
  onClose,
  kind,
  name,
  detail,
  previewUris = [],
  state,
  onChange,
  busy,
}: ShareSheetProps) {
  const styles = useStyles();
  const theme = useTheme();
  const shared = state.sharing === 'link';
  const followers = state.followers ?? 0;
  const made = state.madeItTheirs ?? 0;
  const noun = kind === 'collection' ? 'collection' : 'plan';

  const choose = async (sharing: Sharing) => {
    if (sharing === state.sharing || busy) return;
    if (sharing === 'private' && (followers > 0 || made > 0)) {
      const yes = await confirm({
        title: `Stop sharing ${name}?`,
        message: followers
          ? `The ${followers === 1 ? 'person' : `${followers} people`} tagging along will lose it, and the link stops working. Versions people made theirs stay theirs.`
          : 'The link stops working straight away. Versions people made theirs stay theirs.',
        confirmLabel: 'Stop sharing',
        destructive: true,
      });
      if (!yes) return;
    }
    haptics.selection();
    await onChange(sharing);
  };

  const shareLink = () => {
    if (!state.shareUrl) return;
    track('share_link', { kind });
    Share.share({ message: `${name} on Yasante: ${state.shareUrl}`, url: state.shareUrl }).catch(
      () => {}
    );
  };

  const option = (value: Sharing, title: string, line: string, Icon: typeof Lock) => {
    const on = state.sharing === value;
    return (
      <PressableScale
        onPress={() => choose(value)}
        scaleTo={0.99}
        accessibilityRole="radio"
        accessibilityState={{ checked: on, busy }}
        accessibilityLabel={`${title}. ${line}`}
        style={styles.option}
        testID={`share-${value}`}
      >
        <View style={[styles.optionIcon, on && styles.optionIconOn]}>
          <Icon
            size={16}
            color={on ? theme.colors.accent : theme.colors.text.secondary}
            strokeWidth={2.2}
          />
        </View>
        <View style={styles.optionText}>
          <Text variant="callout">{title}</Text>
          <Text variant="footnote" tone="secondary">
            {line}
          </Text>
        </View>
        <View style={styles.tick}>
          {on && (
            <Animated.View
              entering={ZoomIn.springify().damping(15)}
              exiting={FadeOut.duration(100)}
            >
              <Check size={20} color={theme.colors.accent} strokeWidth={2.6} />
            </Animated.View>
          )}
        </View>
      </PressableScale>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body} testID="share-sheet">
        <View style={styles.head}>
          {kind === 'collection' ? (
            <View style={styles.thumbs}>
              {previewUris.slice(0, 3).map((uri, i) => (
                <RemoteImage
                  key={uri}
                  uri={uri}
                  style={[
                    styles.thumb,
                    {
                      left: i * 7,
                      top: 3 - i,
                      zIndex: 3 - i,
                      transform: [{ rotate: `${(i - 1) * -6}deg` }],
                    },
                  ]}
                  recyclingKey={`share-${i}`}
                />
              ))}
            </View>
          ) : (
            <View style={styles.planIcon}>
              <Droplets size={24} color={theme.colors.accent} />
            </View>
          )}
          <View style={styles.headText}>
            <Text variant="title3" numberOfLines={2}>
              Share {name}
            </Text>
            <Text variant="footnote" tone="secondary">
              {detail}
            </Text>
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="overline" tone="tertiary" style={{ marginLeft: space.xs }}>
            Who can see it
          </Text>
          <View style={styles.options} accessibilityRole="radiogroup">
            {option('private', 'Only you', `Nobody else can open this ${noun}.`, Lock)}
            <View style={styles.divider} />
            {option(
              'link',
              'Anyone with the link',
              'They can look, tag along, or make it theirs.',
              Link2
            )}
          </View>
        </View>

        {shared && (
          <Animated.View entering={FadeInDown.duration(240)} style={styles.shared}>
            <Button
              label="Share link"
              icon={ShareIcon}
              onPress={shareLink}
              fullWidth
              testID="share-link"
            />
            {!!shareCounts(followers, made) && (
              <Animated.View entering={FadeIn.delay(80).duration(200)} style={styles.stats}>
                <Users size={14} color={theme.colors.text.secondary} />
                <Text variant="footnote" tone="secondary">
                  {shareCounts(followers, made)}
                </Text>
              </Animated.View>
            )}
          </Animated.View>
        )}
        <Text variant="caption" tone="tertiary" align="center">
          {shared
            ? 'You can stop sharing any time. The link stops working straight away.'
            : 'Share it and anyone with the link can see it. Nothing else of yours.'}
        </Text>
      </View>
    </Sheet>
  );
}
