import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const alert = style({
  display: 'flex',
  gap: space.sm,
  alignItems: 'flex-start',
  padding: `${space.md}px ${space.lg}px`,
  borderRadius: radius.md,
  fontSize: '0.875rem',
  lineHeight: 1.43,
});

globalStyle(`${alert} svg`, { flex: 'none', marginTop: 2 });

export const tone = styleVariants({
  danger: { background: vars.color.dangerSoft, color: vars.color.danger },
  success: { background: vars.color.successSoft, color: vars.color.success },
  info: { background: vars.color.accentSoft, color: vars.color.accent },
});
