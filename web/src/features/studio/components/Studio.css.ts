import { style } from '@vanilla-extract/css';
import { media, space } from '@/shared/theme/tokens';

export const head = style({ display: 'grid', gap: space.xs, marginBottom: space.lg });

export const columns = style({
  display: 'grid',
  gap: space.xl,
  '@media': {
    [media.desktop]: {
      gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
      alignItems: 'start',
    },
  },
});

export const card = style({ display: 'grid', gap: space.md });
export const link = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: space.md,
});
export const stats = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: space.md,
});
export const stat = style({ display: 'grid', gap: 2 });
export const form = style({ display: 'grid', gap: space.lg, maxWidth: 640 });
