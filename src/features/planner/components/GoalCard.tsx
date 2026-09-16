import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';
import { Badge } from '@/shared/ui/Badge';
import { Goal } from '@/features/planner';
import { formatFriendlyDate, getDaysUntil } from '@/shared/utils/date';
import { useEffect } from 'react';
import type { Theme } from '@/shared/theme/ThemeProvider';

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

const ProgressBar = styled.View`
  height: 4px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-radius: 2px;
  overflow: hidden;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const ProgressFill = styled(Animated.View)`
  height: 100%;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  border-radius: 2px;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const StatusBadge = styled(Badge)`
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

export interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
  testID?: string;
}

export function GoalCard({ goal, onPress, testID }: GoalCardProps) {
  const { theme } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(goal.progress, { duration: 500 });
  }, [goal.progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const daysUntil = getDaysUntil(goal.targetDate);
  const isOverdue = daysUntil < 0;

  return (
    <Card onPress={onPress} testID={testID}>
      <Header>
        <Text variant="h3" weight="semibold" style={{ flex: 1 }}>
          {goal.name}
        </Text>
        <StatusBadge
          variant={goal.status === 'completed' ? 'success' : goal.status === 'active' ? 'primary' : 'default'}
        >
          {goal.status}
        </StatusBadge>
      </Header>
      {goal.description && (
        <Text variant="body" color={theme.colors.text.medium} style={{ marginBottom: theme.spacing[2] }}>
          {goal.description}
        </Text>
      )}
      <Text variant="caption" color={theme.colors.text.low}>
        Target: {formatFriendlyDate(goal.targetDate)} {isOverdue && '(Overdue)'}
      </Text>
      <ProgressBar>
        <ProgressFill style={progressStyle} />
      </ProgressBar>
      <Text variant="caption" color={theme.colors.text.medium} style={{ marginTop: theme.spacing[1] }}>
        {goal.progress}% complete
      </Text>
    </Card>
  );
}

