import { keyframes, style } from '@vanilla-extract/css';
import {
  CONTENT_WIDTH,
  EASE_OUT,
  GUTTER,
  media,
  radius,
  space,
  weight,
} from '@/shared/theme/tokens';
import { darkSurface, vars } from '@/shared/theme/vars.css';

export const HEADER_HEIGHT = 64;

export const header = style({ position: 'sticky', top: 0, zIndex: 10 });

/** Over the home page's hero: fixed, inside its frame, always in the dark theme's colours. */
export const overlay = style([
  darkSurface,
  { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, color: vars.color.text.primary },
]);

const appear = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

/**
 * The glass fades in once the page has scrolled under it, driven by the scroll itself:
 * nothing re-renders, and browsers without scroll timelines simply show it.
 */
export const glass = style({
  position: 'absolute',
  inset: '-1px 0 0',
  borderLeft: 0,
  borderRight: 0,
  borderTop: 0,
  pointerEvents: 'none',
  '@supports': {
    '(animation-timeline: scroll())': {
      animation: `${appear} linear both`,
      animationTimeline: 'scroll(root)',
      animationRange: '0 48px',
    },
  },
});

export const row = style({
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  gap: space.md,
  maxWidth: CONTENT_WIDTH + 2 * GUTTER,
  height: HEADER_HEIGHT,
  margin: '0 auto',
  padding: `0 ${GUTTER}px`,
  selectors: {
    [`${overlay} &`]: { maxWidth: 'none', height: HEADER_HEIGHT + 16, padding: '8px 22px 0' },
  },
  '@media': {
    [media.large]: {
      gridTemplateColumns: '1fr auto 1fr',
      selectors: { [`${overlay} &`]: { padding: `8px ${space.xxxl}px 0` } },
    },
  },
});

export const nav = style({
  order: 2,
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: 6,
  '@media': { [media.large]: { order: 0, justifyContent: 'flex-start' } },
});

export const brand = style({
  order: 1,
  justifySelf: 'start',
  '@media': { [media.large]: { justifySelf: 'center' } },
});

export const end = style({ order: 3, justifySelf: 'end' });

export const pill = style({
  display: 'inline-flex',
  alignItems: 'center',
  height: 38,
  padding: `0 ${space.lg}px`,
  '@media': { [media.phone]: { height: 34, padding: `0 ${space.md}px`, fontSize: 11 } },
  borderRadius: radius.pill,
  border: `1px solid ${vars.color.glass.border}`,
  background: vars.color.glass.fill,
  color: vars.color.text.secondary,
  fontSize: 12,
  fontWeight: weight.bold,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  transition: `color 180ms ${EASE_OUT}, background-color 180ms ${EASE_OUT}`,
  selectors: {
    '&:hover': { color: vars.color.text.primary },
    '&[aria-current="page"]': {
      background: vars.color.text.primary,
      color: vars.color.bg,
      borderColor: 'transparent',
    },
  },
});

/** Only where there's room for it. */
export const wide = style({ '@media': { [media.phone]: { display: 'none' } } });
