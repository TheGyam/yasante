import { style } from '@vanilla-extract/css';
import { media, space } from '@/shared/theme/tokens';

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: space.sm,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  '@media': {
    [media.tablet]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: space.md },
    [media.large]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  },
});

export const more = style({
  display: 'grid',
  justifyItems: 'center',
  gap: space.md,
  padding: `${space.xxl}px 0`,
});
