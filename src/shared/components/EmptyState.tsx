import React from 'react';
import { View } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import type { Theme } from '@/shared/theme/ThemeProvider';

const Container = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
`;

const IconContainer = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  width: 120px;
  height: 120px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.large}px;
`;

const Title = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  text-align: center;
`;

const Description = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
  text-align: center;
`;

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <Container testID={testID} accessible={true} accessibilityRole="text">
      {icon && <IconContainer>{icon}</IconContainer>}
      <Title variant="h3" weight="semibold">
        {title}
      </Title>
      {description && (
        <Description variant="body" color={theme.colors.text.medium}>
          {description}
        </Description>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          onPress={onAction}
          testID={testID ? `${testID}-action` : undefined}
        >
          {actionLabel}
        </Button>
      )}
    </Container>
  );
}
