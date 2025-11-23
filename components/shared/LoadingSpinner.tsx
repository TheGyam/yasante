import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { responsive } from '@/utils/responsive';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  message,
  fullScreen = false,
}) => {
  const { theme } = useTheme();

  const content = (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        ...(fullScreen && {
          flex: 1,
          backgroundColor: theme.colors.background,
        }),
      }}
    >
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && (
        <Text
          style={{
            marginTop: theme.spacing[3],
            fontSize: responsive.fontScale(theme.typography.fontSize.sm),
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamily.regular,
          }}
        >
          {message}
        </Text>
      )}
    </View>
  );

  return content;
};














