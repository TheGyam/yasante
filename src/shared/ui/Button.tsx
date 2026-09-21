import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { fonts, makeStyles, radius, space, useTheme, type Theme } from '@/shared/theme';
import { PressableScale, type PressableScaleProps } from './PressableScale';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps extends Omit<PressableScaleProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizes = StyleSheet.create({
  // Minimums, so text at the largest accessibility sizes grows the button, not clips.
  lg: { minHeight: 56, paddingHorizontal: space.xxl, paddingVertical: space.sm },
  md: { minHeight: 48, paddingHorizontal: space.xl, paddingVertical: space.sm },
  sm: { minHeight: 36, paddingHorizontal: space.md + 2, paddingVertical: space.xs },
});

const labels = StyleSheet.create({
  lg: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  md: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  sm: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
});

const ICON_SIZE: Record<ButtonSize, number> = { lg: 20, md: 18, sm: 16 };

const useStyles = makeStyles(t => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.pill,
  },
  fullWidth: { alignSelf: 'stretch' },
  primary: { backgroundColor: t.colors.accent },
  secondary: {
    backgroundColor: t.colors.glass.fillStrong,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: t.colors.dangerSoft },
}));

function contentColor(theme: Theme, variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return theme.colors.text.onAccent;
    case 'secondary':
      return theme.colors.text.primary;
    case 'ghost':
      return theme.colors.accent;
    case 'danger':
      return theme.colors.danger;
  }
}

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  trailingIcon: TrailingIcon,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const styles = useStyles();
  const theme = useTheme();
  const color = contentColor(theme, variant);
  const iconSize = ICON_SIZE[size];

  return (
    <PressableScale
      {...rest}
      disabled={disabled || loading}
      accessibilityLabel={rest.accessibilityLabel ?? label}
      accessibilityState={{ busy: loading }}
      containerStyle={fullWidth && styles.fullWidth}
      style={[styles.base, sizes[size], styles[variant], style]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {Icon && <Icon size={iconSize} color={color} strokeWidth={2.2} />}
          <Text style={[labels[size], { color }]} numberOfLines={1}>
            {label}
          </Text>
          {TrailingIcon && <TrailingIcon size={iconSize} color={color} strokeWidth={2.2} />}
        </>
      )}
    </PressableScale>
  );
}
