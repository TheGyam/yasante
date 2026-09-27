import { style } from '@vanilla-extract/css';
import { media, radius, space } from '@/shared/theme/tokens';

/** Shared by her studio's screens: a title with an action beside it, and a narrow form. */
export const head = style({
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: space.lg,
  marginBottom: space.lg,
});

export const form = style({ maxWidth: 640, display: 'grid', gap: space.lg });
export const card = style({ display: 'grid', gap: space.lg });
export const group = style({ display: 'grid', gap: space.sm });
export const chips = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });
export const actions = style({ display: 'flex', flexWrap: 'wrap', gap: space.md });

/** An option row: its name, what it adds, and a way to remove it. */
export const option = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr auto',
  gap: space.sm,
  alignItems: 'end',
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: space.xs,
  borderRadius: radius.lg,
  overflow: 'hidden',
  '@media': { [media.tablet]: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' } },
});

export const tile = style({ position: 'relative' });

export const tileAction = style({
  position: 'absolute',
  top: space.xs,
  right: space.xs,
});

export const day = style({
  display: 'grid',
  gridTemplateColumns: '120px 1fr 1fr',
  gap: space.sm,
  alignItems: 'center',
});
