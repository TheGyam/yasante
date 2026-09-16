import React from 'react';
import { Switch as RNSwitch, SwitchProps as RNSwitchProps } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import type { Theme } from '@/shared/theme/ThemeProvider';

const Container = styled.View`
  flex-direction: row;
  align-items: center;
`;

const Label = styled.View`
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

export interface SwitchProps extends RNSwitchProps {
  label?: string;
  testID?: string;
}

export function Switch({ label, value, onValueChange, testID, ...props }: SwitchProps) {
  const { theme } = useTheme();

  return (
    <Container testID={testID} accessible={true} accessibilityRole="switch">
      {label && <Label>{/* Label would be rendered here if needed */}</Label>}
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.colors.surfaceVariant,
          true: theme.colors.primary,
        }}
        thumbColor={value ? '#ffffff' : theme.colors.border}
        ios_backgroundColor={theme.colors.surfaceVariant}
        {...props}
      />
    </Container>
  );
}
