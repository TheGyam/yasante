import React from 'react';
import { View, TextInput, TextInputProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/shared/hooks/useTheme';

interface BrutalistInputProps extends Omit<TextInputProps, 'style'> {
  icon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
}

export function BrutalistInput({ icon, containerStyle, style, ...props }: BrutalistInputProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          backgroundColor: theme.colors.surface,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: theme.colors.text.high,
          marginBottom: 10,
        },
        containerStyle,
      ]}
    >
      {icon}
      <TextInput
        placeholderTextColor={theme.colors.primary}
        {...props}
        style={[
          {
            flex: 1,
            fontSize: 15,
            color: theme.colors.text.high,
            fontFamily: 'Lato-Regular',
            padding: 0,
            fontWeight: '600',
          },
          style,
        ]}
      />
    </View>
  );
}
