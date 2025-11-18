import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { responsive } from '@/utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  rightAction,
  onBackPress,
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Ensure showBack is always a boolean
  const showBackBool = Boolean(showBack);
  
  // Debug logging
  if (__DEV__ && typeof showBack !== 'boolean' && showBack !== undefined) {
    console.warn('Header received non-boolean showBack:', {
      value: showBack,
      type: typeof showBack,
    });
  }

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          paddingHorizontal: theme.spacing[4],
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          {showBackBool && (
            <TouchableOpacity
              onPress={handleBack}
              style={{
                marginRight: theme.spacing[3],
                padding: theme.spacing[1],
              }}
            >
              <Text
                style={{
                  fontSize: responsive.fontScale(theme.typography.fontSize.xl),
                  color: theme.colors.primary,
                }}
              >
                ←
              </Text>
            </TouchableOpacity>
          )}
          <Text
            style={{
              fontSize: responsive.fontScale(theme.typography.fontSize.xl),
              fontFamily: theme.typography.fontFamily.bold,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        {rightAction && <View>{rightAction}</View>}
      </View>
    </View>
  );
};

