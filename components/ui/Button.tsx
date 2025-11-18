import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { useTheme } from '@/theme';
import { responsive } from '@/utils/responsive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  
  // Ensure all boolean props are actual booleans
  const disabledBool = Boolean(disabled);
  const loadingBool = Boolean(loading);
  const fullWidthBool = Boolean(fullWidth);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 15,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 15,
    }).start();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.sizes.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: disabledBool || loadingBool ? 0.6 : 1,
    };

    // Size styles
    const sizeStyles = {
      sm: {
        height: theme.sizes.button.sm.height,
        paddingHorizontal: theme.sizes.button.sm.paddingHorizontal,
      },
      md: {
        height: theme.sizes.button.md.height,
        paddingHorizontal: theme.sizes.button.md.paddingHorizontal,
      },
      lg: {
        height: theme.sizes.button.lg.height,
        paddingHorizontal: theme.sizes.button.lg.paddingHorizontal,
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary,
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidthBool && { width: '100%' }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: theme.typography.fontFamily.semiBold,
      fontWeight: theme.typography.fontWeight.semiBold,
    };

    const sizeStyles = {
      sm: { fontSize: responsive.fontScale(theme.typography.fontSize.sm) },
      md: { fontSize: responsive.fontScale(theme.typography.fontSize.base) },
      lg: { fontSize: responsive.fontScale(theme.typography.fontSize.lg) },
    };

    const variantTextColors = {
      primary: theme.colors.background,
      secondary: theme.colors.text,
      outline: theme.colors.primary,
      ghost: theme.colors.primary,
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      color: variantTextColors[variant],
    };
  };

  // Debug logging for boolean props
  if (__DEV__ && (typeof disabled !== 'boolean' || typeof loading !== 'boolean')) {
    console.warn('Button received non-boolean props:', {
      disabled: { value: disabled, type: typeof disabled },
      loading: { value: loading, type: typeof loading },
    });
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabledBool || loadingBool}
        activeOpacity={0.9}
      >
      {loadingBool ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'secondary' ? theme.colors.background : theme.colors.primary}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
      </TouchableOpacity>
    </Animated.View>
  );
};

