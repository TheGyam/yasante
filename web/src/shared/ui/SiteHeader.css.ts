import { keyframes, style } from '@vanilla-extract/css';
import {
  CONTENT_WIDTH,
  EASE_OUT,
  GUTTER,
  HIT_TARGET,
  media,
  radius,
  space,
  weight,
} from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const HEADER_HEIGHT = 64;

export const header = style({ position: 'sticky', top: 0, zIndex: 10 });

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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.lg,
  maxWidth: CONTENT_WIDTH,
  height: HEADER_HEIGHT,
  margin: '0 auto',
  padding: `0 ${GUTTER}px`,
});

export const nav = style({ display: 'flex', alignItems: 'center', gap: space.xs });

export const link = style({
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: HIT_TARGET,
  padding: `0 ${space.md}px`,
  borderRadius: radius.pill,
  color: vars.color.text.secondary,
  fontSize: '0.9375rem',
  fontWeight: weight.medium,
  transition: `color ${vars.time.state} ${EASE_OUT}`,
  selectors: { '&:hover, &[aria-current="page"]': { color: vars.color.text.primary } },
});

export const wide = style({ '@media': { [media.phone]: { display: 'none' } } });
