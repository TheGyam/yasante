import { style } from '@vanilla-extract/css';
import { media, space } from '@/shared/theme/tokens';

export const form = style({ display: 'grid', gap: space.lg });

export const row = style({
  display: 'grid',
  gap: space.lg,
  '@media': { [media.tablet]: { gridTemplateColumns: '1fr 1fr' } },
});

/** People never see this field; bots fill in every field they find. */
export const trap = style({
  position: 'absolute',
  left: -9999,
  width: 1,
  height: 1,
  overflow: 'hidden',
});

export const done = style({ display: 'grid', gap: space.xs });
