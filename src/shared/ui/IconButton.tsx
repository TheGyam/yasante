import type { StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { HIT_TARGET, makeStyles, useTheme } from '@/shared/theme';
import { PressableScale, type PressableScaleProps } from './PressableScale';

export interface IconButtonProps extends Omit<PressableScaleProps, 'children' | 'style'> {
  icon: LucideIcon;
  /** Required: an icon has no text for screen readers to announce. */
  accessibilityLabel: string;
  /** `overlay` sits on photos and video, so it ignores the theme. */
  variant?: 'glass' | 'plain' | 'accent' | 'overlay';
  size?: number;
  /** Where the button sits — applied to the touch target, so absolute works. */
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
  overlay: { backgroundColor: 'rgba(12,8,10,0.44)' },
}));

export function IconButton({
  icon: Icon,
  variant = 'glass',
  size = 40,
  style,
  containerStyle,
  ...rest
}: IconButtonProps) {
  const styles = useStyles();
  const theme = useTheme();
  const color =
    variant === 'accent'
      ? theme.colors.text.onAccent
      : variant === 'overlay'
        ? '#FFFFFF'
        : theme.colors.text.primary;
  // Keep a 44pt target even when the visual is smaller.
  const slop = Math.max(0, (HIT_TARGET - size) / 2);

  return (
    <PressableScale
      hitSlop={slop}
      {...rest}
      // Positioning belongs on the touch target. Put it on the view that scales and
      // the pressable stays behind in the layout at zero height — the button looks
      // right and nothing can press it.
      containerStyle={[containerStyle, style]}
      style={[styles.base, styles[variant], { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Icon size={Math.round(size * 0.48)} color={color} strokeWidth={2.2} />
    </PressableScale>
  );
}
