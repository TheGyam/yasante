import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { responsive } from '@/utils/responsive';
import { FadeInView } from '../animations/FadeIn';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  size = 'md',
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  // Ensure boolean props are actual booleans
  const safeTextInputProps = {
    ...textInputProps,
    multiline: textInputProps.multiline ? Boolean(textInputProps.multiline) : undefined,
    editable: textInputProps.editable !== undefined ? Boolean(textInputProps.editable) : undefined,
    secureTextEntry: textInputProps.secureTextEntry ? Boolean(textInputProps.secureTextEntry) : undefined,
    autoFocus: textInputProps.autoFocus ? Boolean(textInputProps.autoFocus) : undefined,
    selectTextOnFocus: textInputProps.selectTextOnFocus ? Boolean(textInputProps.selectTextOnFocus) : undefined,
  };

  const getInputStyle = (): ViewStyle => {
    const sizeStyles = {
      sm: {
        height: theme.sizes.input.sm.height,
        paddingHorizontal: theme.sizes.input.sm.paddingHorizontal,
        fontSize: responsive.fontScale(theme.typography.fontSize.sm),
      },
      md: {
        height: theme.sizes.input.md.height,
        paddingHorizontal: theme.sizes.input.md.paddingHorizontal,
        fontSize: responsive.fontScale(theme.typography.fontSize.base),
      },
      lg: {
        height: theme.sizes.input.lg.height,
        paddingHorizontal: theme.sizes.input.lg.paddingHorizontal,
        fontSize: responsive.fontScale(theme.typography.fontSize.lg),
      },
    };

    return {
      ...sizeStyles[size],
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.sizes.borderRadius.md,
      borderWidth: 1.5,
      borderColor: error
        ? theme.colors.error
        : isFocused
        ? theme.colors.primary
        : theme.colors.border,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.regular,
    };
  };

  return (
    <View style={[{ marginBottom: theme.spacing[4] }, containerStyle]}>
      {label && (
        <Text
          style={{
            fontSize: responsive.fontScale(theme.typography.fontSize.sm),
            fontFamily: theme.typography.fontFamily.medium,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
            marginBottom: theme.spacing[1],
          }}
        >
          {label}
        </Text>
      )}
      <View style={{ position: 'relative' }}>
        {leftIcon && (
          <View
            style={{
              position: 'absolute',
              left: theme.spacing[3],
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[
            getInputStyle(),
            leftIcon && { paddingLeft: theme.spacing[10] },
            rightIcon && { paddingRight: theme.spacing[10] },
            inputStyle,
          ]}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={(e) => {
            setIsFocused(true);
            safeTextInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            safeTextInputProps.onBlur?.(e);
          }}
          {...safeTextInputProps}
        />
        {rightIcon && (
          <View
            style={{
              position: 'absolute',
              right: theme.spacing[3],
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            {rightIcon}
          </View>
        )}
      </View>
      {error && (
        <FadeInView>
          <Text
            style={{
              fontSize: responsive.fontScale(theme.typography.fontSize.xs),
              color: theme.colors.error,
              marginTop: theme.spacing[1],
            }}
          >
            {error}
          </Text>
        </FadeInView>
      )}
      {helperText && !error && (
        <Text
          style={{
            fontSize: responsive.fontScale(theme.typography.fontSize.xs),
            color: theme.colors.textSecondary,
            marginTop: theme.spacing[1],
          }}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
};

