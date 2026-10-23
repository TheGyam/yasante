import { style } from '@vanilla-extract/css';
import { media, radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const header = style({
  display: 'grid',
  gap: space.xl,
  marginBottom: space.xxxl,
  '@media': {
    [media.desktop]: {
      gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
      gap: space.huge,
      alignItems: 'center',
    },
  },
});

/** One large picture and two stacked, as a board's cover. */
export const mosaic = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gridTemplateRows: '1fr 1fr',
  gap: 3,
  aspectRatio: '16 / 11',
  borderRadius: radius.xl,
  overflow: 'hidden',
  background: vars.color.glass.fillStrong,
});

export const mosaicMain = style({ gridRow: '1 / span 2', height: '100%' });
export const mosaicTile = style({ height: '100%' });
export const tileFill = style({ height: '100%', width: '100%' });

export const intro = style({ display: 'grid', gap: space.lg, alignContent: 'start' });
export const author = style({ display: 'flex', alignItems: 'center', gap: space.md });
export const actions = style({ display: 'flex', flexWrap: 'wrap', gap: space.md });

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

export const tile = style({ display: 'grid', gap: space.xs });
export const photo = style({ borderRadius: radius.md });

export const steps = style({
  display: 'grid',
  gap: space.md,
  margin: 0,
  padding: space.xl,
  listStyle: 'none',
  counterReset: 'step',
});

export const step = style({
  display: 'grid',
  gridTemplateColumns: '28px 1fr',
  gap: space.md,
  alignItems: 'start',
  counterIncrement: 'step',
  '::before': {
    content: 'counter(step)',
    display: 'grid',
    placeItems: 'center',
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    background: vars.color.accentSoft,
    color: vars.color.accent,
    fontWeight: 600,
    fontSize: 14,
  },
});

export const planLayout = style({ display: 'grid', gap: space.xxl, maxWidth: 680 });
