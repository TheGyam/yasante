import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const skeleton = style({ height: 320, borderRadius: radius.lg });
export const list = style({
  display: 'grid',
  gap: space.md,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const item = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: space.lg,
  padding: space.xl,
  borderRadius: radius.lg,
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
  '@media': { 'screen and (max-width: 767px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const main = style({ display: 'grid', gap: space.xs, minWidth: 0 });
export const stats = style({
  display: 'grid',
  gap: 2,
  justifyItems: 'end',
  alignContent: 'start',
  '@media': { 'screen and (max-width: 767px)': { justifyItems: 'start' } },
});
export const stat = style({ fontSize: 13, color: c.text.secondary, whiteSpace: 'nowrap' });
export const failed = style({ color: c.danger });
export const problem = style({ maxWidth: 320, fontSize: 12, color: c.danger, textAlign: 'right' });
