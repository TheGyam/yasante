import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { useGoal } from '@/features/planner';
import { usePhotos, useUploadPhoto } from '@/features/planner';
import { TopBar } from '@/shared/legacy/components/TopBar';
import { PhotoTimeline } from '@/features/planner';
import { MediaPicker } from '@/shared/legacy/components/MediaPicker';
import { Plus } from 'lucide-react-native';
import { FloatingActionButton } from '@/shared/legacy/components/FloatingActionButton';
import { Card } from '@/shared/legacy/ui/Card';
import { Text } from '@/shared/legacy/ui/Text';
import { Button } from '@/shared/legacy/ui/Button';
import { formatFriendlyDate, getDaysUntil } from '@/shared/utils/date';
import { useEffect } from 'react';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

// Conditionally import Reanimated
const Animated = (() => {
  try {
    return require('react-native-reanimated').default;
  } catch {
    return require('react-native').Animated;
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

const useSharedValue = (() => {
  try {
    return require('react-native-reanimated').useSharedValue;
  } catch {
    return (value: number) => ({ value });
  }
})();

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const ProgressBar = styled.View`
  height: 8px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-radius: 4px;
  overflow: hidden;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const ProgressFill = styled(Animated.View)`
  height: 100%;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  border-radius: 4px;
`;

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { data: goal, isLoading } = useGoal(id);
  const { data: photos = [], isLoading: photosLoading } = usePhotos(id);
  const uploadPhoto = useUploadPhoto(id);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const progress = useSharedValue(goal?.progress || 0);

  useEffect(() => {
    if (goal) {
      try {
        progress.value = withTiming(goal.progress, { duration: 500 });
      } catch (e) {
        progress.value = goal.progress;
      }
    }
  }, [goal?.progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const handleAddPhoto = async (uri: string) => {
    if (!goal) return;
    try {
      await uploadPhoto.mutateAsync({
        goalId: goal.id,
        uri,
        date: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to upload photo:', error);
    }
  };

  if (isLoading || !goal) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const daysUntil = getDaysUntil(goal.targetDate);

  return (
    <>
      <Container testID="goal-detail-screen">
        <TopBar title={goal.name} />
        <Content>
          <Card>
            <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[2] }}>
              Progress
            </Text>
            <ProgressBar>
              <ProgressFill style={progressStyle} />
            </ProgressBar>
            <Text
              variant="caption"
              color={theme.colors.text.medium}
              style={{ marginTop: theme.spacing[2] }}
            >
              {goal.progress}% complete
            </Text>
            <Text
              variant="body"
              color={theme.colors.text.medium}
              style={{ marginTop: theme.spacing[3] }}
            >
              Target: {formatFriendlyDate(goal.targetDate)} ({daysUntil} days)
            </Text>
            {goal.description && (
              <Text
                variant="body"
                color={theme.colors.text.medium}
                style={{ marginTop: theme.spacing[2] }}
              >
                {goal.description}
              </Text>
            )}
          </Card>

          <View style={{ marginTop: theme.spacing[5] }}>
            <Text variant="h3" weight="semibold" style={{ marginBottom: theme.spacing[3] }}>
              Progress Timeline
            </Text>
            <PhotoTimeline photos={photos} />
          </View>
        </Content>
      </Container>
      <FloatingActionButton
        onPress={() => setShowMediaPicker(true)}
        icon={<Plus size={28} color={theme.colors.surface} strokeWidth={3} />}
        testID="add-photo-fab"
      />
      <MediaPicker
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onImageSelected={handleAddPhoto}
      />
    </>
  );
}
