import React, { useState } from 'react';
import { TextInput, TextInputProps, View, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { Text } from './Text';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

const Container = styled.View<{ error?: boolean; focused?: boolean }>`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const Label = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const InputContainer = styled.View<{ error?: boolean; focused?: boolean }>`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${({
    theme,
    error,
    focused,
  }: {
    theme: Theme;
    error?: boolean;
    focused?: boolean;
  }) => {
    if (error) return theme.colors.error;
    if (focused) return theme.colors.primary;
    return theme.colors.border;
  }};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  min-height: 44px;
`;

const StyledInput = styled(TextInput)`
  flex: 1;
  color: ${({ theme }: { theme: Theme }) => theme.colors.text.high};
  font-size: ${({ theme }: { theme: Theme }) => theme.fontSizes[2]}px;
  padding: 0;
`;

const ClearButton = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const ErrorText = styled(Text)`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  color: ${({ theme }: { theme: Theme }) => theme.colors.error};
`;

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  clearable?: boolean;
  leftIcon?: React.ReactNode;
  testID?: string;
}

export function Input({
  label,
  error,
  clearable = false,
  leftIcon,
  testID,
  value,
  onChangeText,
  placeholderTextColor,
  multiline,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const handleClear = () => {
    onChangeText?.('');
  };

  return (
    <Container error={!!error} focused={focused}>
      {label && (
        <Label variant="label" color={theme.colors.text.medium}>
          {label}
        </Label>
      )}
      <InputContainer error={!!error} focused={focused}>
        {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
        <StyledInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={placeholderTextColor || theme.colors.text.low}
          multiline={multiline}
          testID={testID}
          accessible={true}
          accessibilityLabel={label}
          accessibilityRole="text"
          allowFontScaling={true}
          {...props}
        />
        {clearable && value && value.length > 0 && (
          <ClearButton
            onPress={handleClear}
            testID={testID ? `${testID}-clear` : undefined}
            accessible={true}
            accessibilityLabel="Clear input"
            accessibilityRole="button"
          >
            <Text variant="caption" color={theme.colors.text.low}>
              ✕
            </Text>
          </ClearButton>
        )}
      </InputContainer>
      {error && (
        <ErrorText variant="caption" testID={testID ? `${testID}-error` : undefined}>
          {error}
        </ErrorText>
      )}
    </Container>
  );
}
