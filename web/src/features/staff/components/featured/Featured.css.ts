import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: space.md,
});
export const person = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.lg,
  padding: space.lg,
  border: `1px solid ${vars.color.glass.border}`,
  borderRadius: radius.md,
});
export const avatar = style({ width: 56, height: 56, flexShrink: 0, borderRadius: radius.pill });
export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
  gap: space.lg,
});
export const photos = style({ display: 'flex', gap: space.sm, overflowX: 'auto' });
export const photo = style({ width: 110, minWidth: 110, borderRadius: radius.sm });
export const drop = style({
  padding: space.lg,
  border: `1px dashed ${vars.color.glass.border}`,
  borderRadius: radius.md,
  display: 'grid',
  gap: space.md,
});
export const fields = style({
  border: 0,
  padding: 0,
  margin: 0,
  minWidth: 0,
  display: 'grid',
  gap: space.lg,
});
export const danger = style({
  color: vars.color.danger,
  borderColor: vars.color.danger,
  background: vars.color.dangerSoft,
});
export const link = style({ overflowWrap: 'anywhere' });
