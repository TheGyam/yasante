import React from 'react';
import { TouchableOpacity, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/hooks/useTheme';

export interface FloatingActionButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  visible?: boolean;
  testID?: string;
}

export function FloatingActionButton({ onPress, icon, visible = true, testID }: FloatingActionButtonProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  if (!visible) return null;

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        position: 'absolute',
        bottom: insets.bottom + 16 + 56 + 16, // safe area + tab bar height (56) + spacing
        right: 24,
        width: 60,
        height: 60,
        backgroundColor: theme.colors.primary,
        borderRadius: 16,
        borderWidth: 4,
        borderColor: theme.colors.text.high,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.text.high,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 8,
        zIndex: 1001,
      }}
    >
      <View style={{ transform: [{ scale: 1.2 }] }}>
        {icon}
      </View>
    </TouchableOpacity>
  );
}
