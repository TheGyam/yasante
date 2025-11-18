import React, { useState } from 'react';
import { Image, ImageProps, ActivityIndicator, View } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.View`
  position: relative;
  overflow: hidden;
`;

const StyledImage = styled(Image)`
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

const LoadingContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

export interface ImageWithPlaceholderProps extends ImageProps {
  placeholder?: React.ReactNode;
  testID?: string;
}

export function ImageWithPlaceholder({
  source,
  placeholder,
  testID,
  onLoadStart,
  onLoadEnd,
  onError,
  ...props
}: ImageWithPlaceholderProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setLoading(false);
    onLoadEnd?.();
  };

  const handleError = (e: any) => {
    setLoading(false);
    setError(true);
    onError?.(e);
  };

  return (
    <Container testID={testID} accessible={true} accessibilityRole="image">
      {!error && source && (
        <StyledImage
          source={source}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          {...props}
        />
      )}
      {loading && (
        <LoadingContainer>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </LoadingContainer>
      )}
      {(error || !source) && (
        <Placeholder>
          {placeholder || (
            <ActivityIndicator size="small" color={theme.colors.text.low} />
          )}
        </Placeholder>
      )}
    </Container>
  );
}

