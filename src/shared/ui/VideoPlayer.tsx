import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import Animated, { FadeOut } from 'react-native-reanimated';
import { makeStyles, radius } from '@/shared/theme';
import { RemoteImage } from './RemoteImage';

export interface VideoPlayerProps {
  uri: string;
  poster?: string | null;
  loop?: boolean;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}

const POSTER_EXIT = FadeOut.duration(250);

const useStyles = makeStyles(t => ({
  frame: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: t.colors.glass.fillStrong,
  },
}));

/**
 * Native video with platform controls. The poster stays up until the first frame is
 * ready, then fades — so there's never a black box while the stream buffers.
 */
export function VideoPlayer({ uri, poster, loop = false, muted = false, style }: VideoPlayerProps) {
  const styles = useStyles();
  const player = useVideoPlayer(uri, p => {
    p.loop = loop;
    p.muted = muted;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const ready = status === 'readyToPlay';

  return (
    <View style={[styles.frame, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls
        allowsFullscreen
        allowsPictureInPicture
      />
      {poster && !ready && (
        <Animated.View pointerEvents="none" exiting={POSTER_EXIT} style={StyleSheet.absoluteFill}>
          <RemoteImage uri={poster} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
    </View>
  );
}
