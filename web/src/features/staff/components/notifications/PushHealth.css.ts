import { style } from '@vanilla-extract/css';
import { space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const good = style({ color: vars.color.success, flexShrink: 0 });
export const bad = style({ color: vars.color.danger, flexShrink: 0 });
export const facts = style({ display: 'grid', gap: space.xs });
export const fact = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.xs,
  fontSize: 13,
  color: vars.color.text.secondary,
});
