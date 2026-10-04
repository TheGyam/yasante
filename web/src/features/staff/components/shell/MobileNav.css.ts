import { style } from '@vanilla-extract/css';
import { space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const bar = style({
  display: 'none',
  '@media': {
    'screen and (max-width: 767px)': {
      position: 'fixed',
      zIndex: 30,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: c.glass.chromeSolid,
      backdropFilter: 'blur(24px) saturate(1.4)',
      borderTop: `1px solid ${c.separator}`,
    },
  },
});

export const tab = style({
  display: 'grid',
  justifyItems: 'center',
  alignContent: 'center',
  gap: 2,
  height: 60,
  border: 0,
  background: 'transparent',
  color: c.text.tertiary,
  font: 'inherit',
  fontSize: 11,
  fontWeight: weight.semibold,
  textDecoration: 'none',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  selectors: { '&[aria-current="page"]': { color: c.accent } },
});

export const iconWrap = style({ position: 'relative', display: 'grid' });

export const badge = style({
  position: 'absolute',
  top: -6,
  right: -12,
  minWidth: 18,
  height: 18,
  fontSize: 10,
  padding: `0 ${space.xs}px`,
});
