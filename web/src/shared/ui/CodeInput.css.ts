import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const code = style({
  width: '100%',
  minHeight: 64,
  padding: `0 ${space.lg}px`,
  borderRadius: radius.md,
  border: `1px solid ${vars.color.glass.border}`,
  background: vars.color.glass.fillStrong,
  color: vars.color.text.primary,
  fontSize: '1.75rem',
  fontWeight: weight.semibold,
  letterSpacing: '0.5em',
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
  ':focus': { outline: 'none', borderColor: vars.color.accent },
  '::placeholder': { color: vars.color.text.tertiary, letterSpacing: '0.5em' },
});

export const invalid = style({ borderColor: vars.color.danger });
