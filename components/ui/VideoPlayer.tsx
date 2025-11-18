import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
// Temporarily disabled - expo-av may require dev build
// import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useTheme } from '@/theme';
import { FadeInView } from '../animations/FadeIn';

interface VideoPlayerProps {
  uri: string;
  thumbnailUri?: string;
  style?: any;
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  thumbnailUri,
  style,
  autoPlay = false,
  loop = false,
  showControls = true,
}) => {
  const { theme } = useTheme();
  // const videoRef = useRef<Video>(null);
  // Ensure all boolean props are actual booleans
  const autoPlayBool = Boolean(autoPlay);
  const loopBool = Boolean(loop);
  const showControlsBool = Boolean(showControls);
  
  const [isPlaying, setIsPlaying] = useState(autoPlayBool);
  const [isLoading, setIsLoading] = useState(true);
  const [showThumbnail, setShowThumbnail] = useState(!!thumbnailUri && !autoPlayBool);

  // Temporarily disabled
  // const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
  //   if (status.isLoaded) {
  //     setIsPlaying(status.isPlaying);
  //     setIsLoading(false);
  //     if (status.didJustFinish && !loopBool) {
  //       setIsPlaying(false);
  //     }
  //   }
  // };

  const togglePlayPause = async () => {
    // Temporarily disabled
    if (showThumbnail) {
      setShowThumbnail(false);
      setIsPlaying(true);
      // await videoRef.current?.playAsync();
    } else if (isPlaying) {
      // await videoRef.current?.pauseAsync();
      setIsPlaying(false);
    } else {
      // await videoRef.current?.playAsync();
      setIsPlaying(true);
    }
  };

  return (
    <View
      style={[
        {
          borderRadius: theme.sizes.borderRadius.lg,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceVariant,
          position: 'relative',
        },
        style,
      ]}
    >
      {showThumbnail && thumbnailUri ? (
        <TouchableOpacity
          onPress={togglePlayPause}
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FadeInView>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: theme.colors.overlay,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24, color: theme.colors.background }}>
                ▶
              </Text>
            </View>
          </FadeInView>
        </TouchableOpacity>
      ) : (
        <>
          {/* Temporarily disabled - expo-av may require dev build */}
          <View style={{ width: '100%', height: '100%', backgroundColor: theme.colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.text }}>Video player temporarily disabled</Text>
          </View>
          {isLoading && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.surfaceVariant,
              }}
            >
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          )}
        </>
      )}
    </View>
  );
};

