import React from 'react';
import { Image, ImageProps as RNImageProps, ActivityIndicator, View, StyleSheet } from 'react-native';
import { Image as ExpoImage, ImageContentFit } from 'expo-image';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import type { Theme } from '@/shared/theme/ThemeProvider';

const Container = styled.View`
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
`;

const Placeholder = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  align-items: center;
  justify-content: center;
`;

export interface ImageWithPlaceholderProps extends Omit<RNImageProps, 'source'> {
  source?: RNImageProps['source'] | string | { uri: string };
  placeholder?: React.ReactNode;
  testID?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';
  priority?: 'low' | 'normal' | 'high'; // Priority for loading
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk'; // Cache policy
}

export function ImageWithPlaceholder({
  source,
  placeholder,
  testID,
  onLoadStart,
  onLoadEnd,
  onError,
  resizeMode = 'cover',
  priority = 'high',
  cachePolicy = 'memory-disk',
  style,
  ...props
}: ImageWithPlaceholderProps) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  // Convert source to expo-image format
  const imageSource = React.useMemo(() => {
    if (!source) return null;
    if (typeof source === 'string') {
      return { uri: source };
    }
    if (typeof source === 'object' && 'uri' in source) {
      return source;
    }
    // Handle React Native ImageSourcePropType
    if (typeof source === 'object' && 'uri' in (source as any)) {
      return { uri: (source as any).uri };
    }
    return null;
  }, [source]);

  // Map resizeMode to expo-image contentFit
  const contentFit = React.useMemo((): ImageContentFit => {
    switch (resizeMode) {
      case 'cover':
        return 'cover';
      case 'contain':
        return 'contain';
      case 'stretch':
        return 'fill';
      case 'center':
        return 'scale-down';
      default:
        return 'cover';
    }
  }, [resizeMode]);

  // Check if image is cached when source changes
  React.useEffect(() => {
    if (!imageSource) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // Reset loading state only if source URI actually changed
    const uri = typeof imageSource === 'object' && 'uri' in imageSource ? imageSource.uri : null;
    if (uri) {
      // expo-image caches images, so if it's cached, it should load instantly
      // We'll let expo-image handle the caching and only show loading if it takes time
      setIsLoading(true);
      setHasError(false);
      // Don't reset hasLoaded - if image was already loaded, keep it visible
    }
  }, [imageSource]);

  const handleLoadStart = () => {
    // Only set loading if we haven't loaded before (for cached images)
    if (!hasLoaded) {
      setIsLoading(true);
    }
    setHasError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    setHasLoaded(true);
    onLoadEnd?.();
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setHasError(true);
    setHasLoaded(false);
    onError?.(error);
  };

  if (!imageSource || hasError) {
    return (
      <Container testID={testID} accessible={true} accessibilityRole="image" style={style}>
        <Placeholder>
          {placeholder || (
            <ActivityIndicator size="small" color={theme.colors.text.low} />
          )}
        </Placeholder>
      </Container>
    );
  }

  return (
    <Container testID={testID} accessible={true} accessibilityRole="image" style={style}>
      {isLoading && !hasLoaded && (
        <Placeholder>
          {placeholder || (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          )}
        </Placeholder>
      )}
      <ExpoImage
        source={imageSource}
        contentFit={contentFit}
        cachePolicy={cachePolicy}
        transition={hasLoaded ? 0 : 200} // No transition if already loaded (cached)
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        style={{ width: '100%', height: '100%' }}
        priority={priority}
        // Enable progressive loading for better UX
        contentPosition="center"
      />
    </Container>
  );
}

