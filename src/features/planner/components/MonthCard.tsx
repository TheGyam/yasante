import React from 'react';
import { TouchableOpacity, View, Platform } from 'react-native';
import styled from 'styled-components/native';
import { Droplets, Scissors, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { Text } from '@/shared/legacy/ui/Text';
import { ImageWithPlaceholder } from '@/shared/legacy/ui/ImageWithPlaceholder';
import { MonthlyCalendar, Goal } from '@/features/planner';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

const CardContainer = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  shadow-color: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowColor};
  shadow-offset: ${({ theme }: { theme: Theme }) =>
    `${theme.shadows.small.shadowOffset.width}px ${theme.shadows.small.shadowOffset.height}px`};
  shadow-opacity: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowOpacity};
  shadow-radius: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowRadius}px;
  elevation: ${({ theme }: { theme: Theme }) =>
    Platform.OS === 'android' ? theme.shadows.small.elevation : 0};
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const MonthInfo = styled.View`
  flex: 1;
`;

const MonthName = styled(Text)`
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.3px;
`;

const Year = styled(Text)`
  font-size: 14px;
  color: ${({ theme }: { theme: Theme }) => theme.colors.text.medium};
  margin-top: 2px;
  font-weight: 400;
`;

const ContentRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const ThumbnailContainer = styled(TouchableOpacity)`
  width: 80px;
  height: 80px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  overflow: hidden;
  align-items: center;
  justify-content: center;
`;

const ThumbnailImage = styled(ImageWithPlaceholder)`
  width: 100%;
  height: 100%;
`;

const ThumbnailPlaceholder = styled.View`
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const ActionButtons = styled.View`
  flex: 1;
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const ActionButton = styled(TouchableOpacity)`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
  min-height: 40px;
`;

const ActionButtonText = styled(Text)`
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  font-weight: 500;
  font-size: 13px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  margin-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const GoalsSection = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const GoalsList = styled.View`
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const GoalItem = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
`;

const GoalInfo = styled.View`
  flex: 1;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const GoalName = styled(Text)`
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
`;

const GoalDescription = styled(Text)`
  font-size: 12px;
  color: ${({ theme }: { theme: Theme }) => theme.colors.text.medium};
`;

const GoalProgressContainer = styled.View`
  align-items: flex-end;
  min-width: 50px;
`;

const GoalProgressText = styled(Text)`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  margin-bottom: 4px;
`;

const GoalProgressBar = styled.View`
  width: 60px;
  height: 4px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  border-radius: 2px;
  overflow: hidden;
`;

const GoalProgressFill = styled.View<{ progress: number }>`
  height: 100%;
  width: ${({ progress }: { progress: number }) => progress}%;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  border-radius: 2px;
`;

export interface MonthCardProps {
  calendar: MonthlyCalendar;
  onAddHairstyle?: (month: string) => void;
  onEditHairstyle?: (hairstyleId: string) => void;
  onViewGoal?: (goalId: string) => void;
}

export function MonthCard({
  calendar,
  onAddHairstyle,
  onEditHairstyle,
  onViewGoal,
}: MonthCardProps) {
  const { theme } = useTheme();
  const hasHairstyle = calendar.hairstyles.length > 0;
  const primaryHairstyle = calendar.hairstyles[0];
  const hasGoals = calendar.goals.length > 0;

  const handleThumbnailPress = () => {
    if (hasHairstyle && primaryHairstyle) {
      onEditHairstyle?.(primaryHairstyle.id);
    } else {
      onAddHairstyle?.(calendar.month);
    }
  };

  const handleActionPress = () => {
    handleThumbnailPress();
  };

  return (
    <CardContainer>
      <Header>
        <MonthInfo>
          <MonthName variant="h3" weight="semibold" color={theme.colors.text.high}>
            {calendar.monthName}
          </MonthName>
          <Year variant="caption" color={theme.colors.text.medium}>
            {calendar.year}
          </Year>
        </MonthInfo>
      </Header>

      <ContentRow>
        <ThumbnailContainer onPress={handleThumbnailPress} activeOpacity={0.7}>
          {hasHairstyle && primaryHairstyle ? (
            <ThumbnailImage
              source={{ uri: primaryHairstyle.photoUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <ThumbnailPlaceholder>
              <ImageIcon size={24} color={theme.colors.text.low} strokeWidth={2} />
            </ThumbnailPlaceholder>
          )}
        </ThumbnailContainer>

        <ActionButtons>
          <ActionButton onPress={handleActionPress} activeOpacity={0.7}>
            <Droplets size={16} color={theme.colors.primary} strokeWidth={2.5} />
            <ActionButtonText variant="caption" weight="medium" color={theme.colors.text.high}>
              Care
            </ActionButtonText>
          </ActionButton>
          <ActionButton onPress={handleActionPress} activeOpacity={0.7}>
            <Scissors size={16} color={theme.colors.primary} strokeWidth={2.5} />
            <ActionButtonText variant="caption" weight="medium" color={theme.colors.text.high}>
              Style
            </ActionButtonText>
          </ActionButton>
        </ActionButtons>
      </ContentRow>

      {hasGoals && (
        <>
          <Divider />
          <GoalsSection>
            <GoalsList>
              {calendar.goals.map(goal => (
                <GoalItem key={goal.id} onPress={() => onViewGoal?.(goal.id)} activeOpacity={0.7}>
                  <GoalInfo>
                    <GoalName variant="body" weight="medium" color={theme.colors.text.high}>
                      {goal.name}
                    </GoalName>
                    {goal.description && (
                      <GoalDescription
                        variant="caption"
                        color={theme.colors.text.medium}
                        numberOfLines={1}
                      >
                        {goal.description}
                      </GoalDescription>
                    )}
                  </GoalInfo>
                  <GoalProgressContainer>
                    <GoalProgressText variant="caption" weight="semibold">
                      {goal.progress}%
                    </GoalProgressText>
                    <GoalProgressBar>
                      <GoalProgressFill progress={goal.progress} />
                    </GoalProgressBar>
                  </GoalProgressContainer>
                </GoalItem>
              ))}
            </GoalsList>
          </GoalsSection>
        </>
      )}
    </CardContainer>
  );
}
