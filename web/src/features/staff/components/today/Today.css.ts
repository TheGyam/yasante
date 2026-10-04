import { style } from '@vanilla-extract/css';
import { space } from '@/shared/theme/tokens';

export const hero = style({ display: 'grid', gap: space.xs, paddingBottom: space.sm });
export const summary = style({ maxWidth: 680, fontSize: 17 });

export const top = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.7fr) minmax(280px, 1fr)',
  gap: space.xl,
  alignItems: 'start',
  '@media': { 'screen and (max-width: 1000px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const bottom = style([top, {}]);
