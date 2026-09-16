import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { makeStyles, type as typeScale, type TypeVariant } from '@/shared/theme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'onAccent'
  | 'success'
  | 'warning'
  | 'danger';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
}

const variants = StyleSheet.create(typeScale);

const aligns = StyleSheet.create({
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
});

const useTones = makeStyles(t => ({
  primary: { color: t.colors.text.primary },
  secondary: { color: t.colors.text.secondary },
  tertiary: { color: t.colors.text.tertiary },
  accent: { color: t.colors.accent },
  onAccent: { color: t.colors.text.onAccent },
  success: { color: t.colors.success },
  warning: { color: t.colors.warning },
  danger: { color: t.colors.danger },
}));

export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  style,
  maxFontSizeMultiplier = 1.6,
  ...rest
}: TextProps) {
  const tones = useTones();
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...rest}
      style={[variants[variant], tones[tone], align && aligns[align], style]}
    />
  );
}
