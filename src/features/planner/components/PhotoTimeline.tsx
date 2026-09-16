import React from 'react';
import { ScrollView, View, TouchableOpacity, Image } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { ProgressPhoto } from '@/features/planner';
import { Text } from '@/shared/legacy/ui/Text';
import { formatFriendlyDate } from '@/shared/utils/date';
import { FadeIn } from '@/shared/legacy/animations/FadeIn';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

const Container = styled.ScrollView`
  flex: 1;
`;

const PhotoItem = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const PhotoImage = styled.Image`
  width: 100%;
  height: 300px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const PhotoInfo = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

export interface PhotoTimelineProps {
  photos: ProgressPhoto[];
  onPhotoPress?: (photo: ProgressPhoto) => void;
  testID?: string;
}

export function PhotoTimeline({ photos, onPhotoPress, testID }: PhotoTimelineProps) {
  const { theme } = useTheme();

  if (photos.length === 0) {
    return (
      <View style={{ padding: theme.spacing[4] }}>
        <Text variant="body" color={theme.colors.text.low} style={{ textAlign: 'center' }}>
          No photos yet. Add your first progress photo!
        </Text>
      </View>
    );
  }

  return (
    <Container testID={testID}>
      {photos.map((photo, index) => (
        <FadeIn key={photo.id} delay={index * 100}>
          <PhotoItem>
            <TouchableOpacity
              onPress={() => onPhotoPress?.(photo)}
              activeOpacity={0.8}
              testID={testID ? `${testID}-photo-${index}` : undefined}
            >
              <PhotoImage source={{ uri: photo.uri }} resizeMode="cover" />
              <PhotoInfo>
                <Text variant="body" weight="semibold">
                  {formatFriendlyDate(photo.date)}
                </Text>
                {photo.caption && (
                  <Text
                    variant="caption"
                    color={theme.colors.text.medium}
                    style={{ marginTop: theme.spacing[1] }}
                  >
                    {photo.caption}
                  </Text>
                )}
              </PhotoInfo>
            </TouchableOpacity>
          </PhotoItem>
        </FadeIn>
      ))}
    </Container>
  );
}
