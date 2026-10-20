import type { ReactNode } from 'react';
import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { MARK, spoken } from '@/shared/lib/format';
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
  mark: { fontFamily: 'YasanteMarks', color: t.colors.accent },
  plainMark: { fontFamily: 'YasanteMarks' },
}));

/** The plait between parts of a line is a glyph of its own font: it costs what a letter costs. */
function withMarks(children: ReactNode, style: object): ReactNode {
  if (typeof children === 'string') {
    if (!children.includes(MARK)) return children;
    return children.split(MARK).flatMap((part, i) =>
      i === 0
        ? [part]
        : [
            <RNText key={i} style={style}>
              {MARK}
            </RNText>,
            part,
          ]
    );
  }
  if (Array.isArray(children)) return children.map(child => withMarks(child, style));
  return children;
}

/** What a screen reader says for text with marks in it: the parts with pauses between. */
function spokenText(children: ReactNode): string | undefined {
  const parts = Array.isArray(children) ? children : [children];
  if (!parts.every(p => typeof p === 'string' || typeof p === 'number')) return undefined;
  const text = parts.join('');
  return text.includes(MARK) ? spoken(text) : undefined;
}

export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  style,
  maxFontSizeMultiplier = 1.6,
  children,
  accessibilityLabel,
  ...rest
}: TextProps) {
  const tones = useTones();
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityLabel={accessibilityLabel ?? spokenText(children)}
      {...rest}
      style={[variants[variant], tones[tone], align && aligns[align], style]}
    >
      {withMarks(children, tone === 'onAccent' ? tones.plainMark : tones.mark)}
    </RNText>
  );
}
