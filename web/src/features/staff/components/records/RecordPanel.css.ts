import { style } from '@vanilla-extract/css';
import { space } from '@/shared/theme/tokens';

export const panel = style({ display: 'grid', gap: space.lg, alignContent: 'start' });
export const head = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: space.md,
  paddingRight: 44,
});
export const titles = style({ display: 'grid', gap: 2, minWidth: 0 });
export const title = style({ overflowWrap: 'anywhere' });
export const actions = style({ display: 'flex', gap: space.xs, flexShrink: 0 });
export const body = style({ minWidth: 0 });
