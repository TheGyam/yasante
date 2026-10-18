import { style } from '@vanilla-extract/css';
import { media, radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const wrapper = style({ position: 'relative', overflow: 'hidden' });

export const track = style({
  display: 'flex',
  overflowX: 'auto',
  scrollSnapType: 'x mandatory',
  scrollBehavior: 'smooth',
  scrollbarWidth: 'none',
  borderRadius: 'inherit',
  '@media': { [media.reducedMotion]: { scrollBehavior: 'auto' } },
});

export const slide = style({ flex: '0 0 100%', scrollSnapAlign: 'center', minWidth: 0 });

const arrow = style({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'none',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: radius.pill,
  border: 0,
  background: vars.color.scrim,
  color: '#fff',
  cursor: 'pointer',
  '@media': { 'screen and (hover: hover)': { display: 'flex' } },
});

export const prev = style([arrow, { left: space.sm }]);
export const next = style([arrow, { right: space.sm }]);

export const dots = style({
  position: 'absolute',
  bottom: space.md,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  gap: space.xs,
});

export const dot = style({
  width: 6,
  height: 6,
  padding: 0,
  borderRadius: radius.pill,
  border: 0,
  background: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
  selectors: { '&[data-active="true"]': { background: '#fff' } },
});

export const counter = style({
  position: 'absolute',
  top: space.sm,
  right: space.sm,
  padding: `2px ${space.sm}px`,
  borderRadius: radius.pill,
  background: vars.color.scrim,
  color: '#fff',
  fontSize: 12,
});
