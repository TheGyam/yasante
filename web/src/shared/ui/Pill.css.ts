import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@/shared/theme/vars.css';
import { radius, space } from '@/shared/theme/tokens';
export const pill = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  padding: '3px 8px',
  borderRadius: radius.pill,
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});
export const tone = styleVariants({
  neutral: { background: vars.color.glass.fillStrong, color: vars.color.text.secondary },
  success: { background: vars.color.successSoft, color: vars.color.success },
  warning: { background: vars.color.warningSoft, color: vars.color.warning },
  danger: { background: vars.color.dangerSoft, color: vars.color.danger },
  accent: { background: vars.color.accentSoft, color: vars.color.text.primary },
});
