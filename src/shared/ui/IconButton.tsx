import type { StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { HIT_TARGET, makeStyles, useTheme } from '@/shared/theme';
import { PressableScale, type PressableScaleProps } from './PressableScale';

export interface IconButtonProps extends Omit<PressableScaleProps, 'children' | 'style'> {
  icon: LucideIcon;
  /** Required: an icon has no text for screen readers to announce. */
  accessibilityLabel: string;
  variant?: 'glass' | 'plain' | 'accent';
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const useStyles = makeStyles(t => ({
  base: { alignItems: 'center', justifyContent: 'center' },
  glass: {
    backgroundColor: t.colors.glass.fillStrong,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
  },
  plain: { backgroundColor: 'transparent' },
  accent: { backgroundColor: t.colors.accent },
}));

export function IconButton({
  icon: Icon,
  variant = 'glass',
  size = 40,
  style,
  ...rest
}: IconButtonProps) {
  const styles = useStyles();
  const theme = useTheme();
  const color = variant === 'accent' ? theme.colors.text.onAccent : theme.colors.text.primary;
  // Keep a 44pt target even when the visual is smaller.
  const slop = Math.max(0, (HIT_TARGET - size) / 2);

  return (
    <PressableScale
      hitSlop={slop}
      {...rest}
      style={[
        styles.base,
        styles[variant],
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Icon size={Math.round(size * 0.48)} color={color} strokeWidth={2.2} />
    </PressableScale>
  );
}
