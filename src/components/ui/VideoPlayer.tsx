import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
// Conditionally import expo-video
const VideoView = (() => {
  try {
    return require('expo-video').VideoView;
  } catch {
    return null;
  }
})();

const useVideoPlayer = (() => {
  try {
    return require('expo-video').useVideoPlayer;
  } catch {
    return null;
  }
})();

// Conditionally import Reanimated for crossfade
const Animated = (() => {
  try {
    return require('react-native-reanimated').default;
  } catch {
    return require('react-native').Animated;
  }
})();

const useSharedValue = (() => {
  try {
    return require('react-native-reanimated').useSharedValue;
  } catch {
    return (value: number) => ({ value });
  }
})();

const useAnimatedStyle = (() => {
  try {
    return require('react-native-reanimated').useAnimatedStyle;
  } catch {
    return (fn: () => any) => fn();
  }
})();

const withTiming = (() => {
  try {
    return require('react-native-reanimated').withTiming;
  } catch {
    return (value: number) => value;
  }
})();

import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.View`
  position: relative;
  overflow: hidden;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const VideoContainer = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const PosterContainer = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const Controls = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
`;

const PlayButton = styled(TouchableOpacity)`
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background-color: rgba(255, 255, 255, 0.9);
  align-items: center;
  justify-content: center;
`;

export interface VideoPlayerProps {
  source: { uri: string } | number;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  testID?: string;
  style?: any;
}

export function VideoPlayer({
  source,
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
  testID,
  style,
}: VideoPlayerProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [isReady, setIsReady] = useState(false);
  const [showControls, setShowControls] = useState(!autoPlay);

  // Video player hook (expo-video)
  const player = useVideoPlayer
    ? useVideoPlayer(
        typeof source === 'object' && 'uri' in source ? source.uri : source,
        (player) => {
          player.loop = loop;
          player.muted = muted;
          if (autoPlay) {
            player.play();
          }
        }
      )
    : null;

  // Poster-to-video crossfade animation
  const posterOpacity = useSharedValue(poster ? 1 : 0);
  const videoOpacity = useSharedValue(0);

  useEffect(() => {
    if (player && isReady && poster) {
      // Crossfade from poster to video
      if (reduceMotion) {
        posterOpacity.value = 0;
        videoOpacity.value = 1;
      } else {
        posterOpacity.value = withTiming(0, { duration: 300 });
        videoOpacity.value = withTiming(1, { duration: 300 });
      }
    } else if (player && isReady) {
      videoOpacity.value = 1;
    }
  }, [isReady, player, poster, reduceMotion]);

  // Handle video ready
  useEffect(() => {
    if (player) {
      const subscription = player.addListener('statusChange', (status: any) => {
        if (status.status === 'readyToPlay') {
          setIsReady(true);
        }
      });

      return () => {
        subscription?.remove();
      };
    }
  }, [player]);

  // If VideoView not available, show placeholder
  if (!VideoView || !useVideoPlayer) {
    return (
      <Container testID={testID} style={style} accessible={true} accessibilityRole="image">
        {poster ? (
          <Image
            source={{ uri: poster }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Controls>
            <Text variant="body" color={theme.colors.text.medium}>
              Video playback requires a development build
            </Text>
          </Controls>
        )}
      </Container>
    );
  }

  const isPlaying = player?.playing || false;
  const isLoading = !isReady;

  const togglePlayback = () => {
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setShowControls(false);
  };

  const posterStyle = useAnimatedStyle
    ? useAnimatedStyle(() => ({
        opacity: posterOpacity.value,
      }))
    : { opacity: poster ? (isReady ? 0 : 1) : 0 };

  const videoStyle = useAnimatedStyle
    ? useAnimatedStyle(() => ({
        opacity: videoOpacity.value,
      }))
    : { opacity: isReady ? 1 : 0 };

  return (
    <Container testID={testID} style={style} accessible={true} accessibilityRole="video">
      {poster && (
        <PosterContainer style={posterStyle}>
          <Image
            source={{ uri: poster }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </PosterContainer>
      )}
      <VideoContainer style={videoStyle}>
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          nativeControls={false}
        />
      </VideoContainer>
      {isLoading && (
        <Controls>
          <ActivityIndicator size="large" color="#ffffff" />
        </Controls>
      )}
      {showControls && !isLoading && (
        <Controls>
          <PlayButton
            onPress={togglePlayback}
            testID={testID ? `${testID}-play` : undefined}
            accessible={true}
            accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
            accessibilityRole="button"
          >
            <Text variant="h3" color={theme.colors.primary}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </PlayButton>
        </Controls>
      )}
    </Container>
  );
}
