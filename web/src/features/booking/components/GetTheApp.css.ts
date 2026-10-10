import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';

export const card = style({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: space.lg,
  alignItems: 'start',
  padding: space.xl,
  textAlign: 'left',
  width: '100%',
});
export const icon = style({ width: 56, height: 56, borderRadius: radius.md });
export const text = style({ display: 'grid', gap: space.xs });
export const buttons = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.sm,
  marginTop: space.sm,
});
