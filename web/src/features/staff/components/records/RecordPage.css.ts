import { style } from '@vanilla-extract/css';
import { space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const back = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  color: vars.color.text.tertiary,
  fontSize: 13,
  fontWeight: weight.medium,
  textDecoration: 'none',
  selectors: { '&:hover': { color: vars.color.text.primary } },
});

export const layout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 720px) minmax(280px, 1fr)',
  gap: space.xxl,
  alignItems: 'start',
  '@media': { 'screen and (max-width: 1100px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const main = style({ minWidth: 0, maxWidth: 720 });

export const aside = style({
  position: 'sticky',
  top: 80,
  display: 'grid',
  gap: space.lg,
  '@media': { 'screen and (max-width: 1100px)': { position: 'static' } },
});
