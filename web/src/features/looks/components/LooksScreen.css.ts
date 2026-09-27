import { style } from '@vanilla-extract/css';
import { GUTTER, space } from '@/shared/theme/tokens';

export const intro = style({ display: 'grid', gap: space.sm, marginBottom: space.xxl });
export const filters = style({ display: 'grid', gap: space.md, marginBottom: space.xxl });

/** The row scrolls edge to edge on a phone, under the gutters. */
export const chips = style({
  display: 'flex',
  gap: space.sm,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  margin: `0 -${GUTTER}px`,
  padding: `2px ${GUTTER}px`,
  '::-webkit-scrollbar': { display: 'none' },
});

export const area = style({ maxWidth: 280 });
