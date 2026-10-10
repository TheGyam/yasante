import { style } from '@vanilla-extract/css';
import { space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const column = style({ maxWidth: 640, margin: '0 auto', display: 'grid', gap: space.xl });
export const head = style({ display: 'grid', gap: space.xs });
export const ask = style({ display: 'grid', gap: space.md });
export const askText = style({ display: 'grid', gap: 2 });
export const answers = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });
export const links = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });
export const move = style({ display: 'grid', gap: space.md });
export const footer = style({ display: 'grid', gap: space.xs, textAlign: 'center' });
export const stars = style({ display: 'flex', gap: space.xs });
export const star = style({
  display: 'grid',
  placeItems: 'center',
  width: 44,
  height: 44,
  border: 0,
  borderRadius: 12,
  background: 'transparent',
  color: vars.color.accent,
  cursor: 'pointer',
});
