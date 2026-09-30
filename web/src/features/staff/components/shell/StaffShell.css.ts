import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const shell = style({
  display: 'grid',
  gridTemplateColumns: '248px minmax(0, 1fr)',
  minHeight: '100dvh',
  transition: `grid-template-columns ${vars.time.move}`,
  selectors: { '&[data-rail="true"]': { gridTemplateColumns: '68px minmax(0, 1fr)' } },
  '@media': {
    'screen and (max-width: 767px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
});

export const aside = style({
  position: 'sticky',
  top: 0,
  height: '100dvh',
  borderRight: `1px solid ${c.separator}`,
  background: c.glass.fill,
  '@media': { 'screen and (max-width: 767px)': { display: 'none' } },
});

export const main = style({ display: 'flex', flexDirection: 'column', minWidth: 0 });

export const content = style({
  width: '100%',
  maxWidth: 1320,
  margin: '0 auto',
  padding: `${space.xxxl}px ${space.xxxl}px ${space.giant}px`,
  '@media': {
    'screen and (max-width: 1100px)': { padding: `${space.xxl}px ${space.xxl}px ${space.giant}px` },
    'screen and (max-width: 767px)': {
      padding: `${space.lg}px ${space.lg}px calc(96px + env(safe-area-inset-bottom))`,
    },
  },
});

export const loading = style({ width: 'min(480px, 100%)', height: 240 });

export const gate = style({
  display: 'grid',
  placeItems: 'center',
  minHeight: '100dvh',
  padding: space.xxl,
});

export const skip = style({
  position: 'absolute',
  left: space.lg,
  top: -80,
  zIndex: 100,
  padding: `${space.sm}px ${space.lg}px`,
  borderRadius: radius.sm,
  background: c.accent,
  color: c.text.onAccent,
  selectors: { '&:focus': { top: space.lg } },
});
