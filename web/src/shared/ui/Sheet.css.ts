import { keyframes, style } from '@vanilla-extract/css';
import { vars } from '@/shared/theme/vars.css';
import { space, radius, duration, EASE_OUT } from '@/shared/theme/tokens';
const slide = keyframes({
  from: { opacity: 0, transform: 'translateX(40px)' },
  to: { opacity: 1, transform: 'translateX(0)' },
});
const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
export const sheet = style({
  margin: '0 0 0 auto',
  padding: 0,
  border: 0,
  width: 560,
  maxWidth: '100vw',
  height: '100dvh',
  maxHeight: '100dvh',
  color: vars.color.text.primary,
  background: vars.color.glass.chromeSolid,
  overflowY: 'auto',
  animation: `${slide} ${Math.min(duration.enter, 240)}ms ${EASE_OUT}`,
  selectors: { '&::backdrop': { background: vars.color.scrim } },
  '@media': {
    '(min-width: 768px) and (max-width: 1100px)': { width: 480 },
    '(max-width: 767px)': { width: '100vw', borderRadius: `${radius.lg}px ${radius.lg}px 0 0` },
    '(prefers-reduced-motion: reduce)': { animation: `${fade} ${duration.pressIn}ms linear` },
  },
});
export const centered = style({
  margin: '10dvh auto auto',
  width: 640,
  height: 'auto',
  maxHeight: '80dvh',
  borderRadius: radius.lg,
  animation: 'none',
  '@media': {
    '(max-width: 767px)': { margin: 0, height: '100dvh', maxHeight: '100dvh', borderRadius: 0 },
  },
});
export const inner = style({
  padding: space.xxl,
  paddingBottom: `max(${space.xxl}px, env(safe-area-inset-bottom))`,
  minHeight: '100%',
  '@media': { '(max-width: 767px)': { padding: space.lg } },
});
export const close = style({ display: 'flex', justifyContent: 'flex-end' });
export const handle = style({
  display: 'none',
  '@media': {
    '(max-width: 767px)': {
      display: 'block',
      width: 48,
      height: 6,
      borderRadius: radius.pill,
      background: vars.color.separator,
      margin: '0 auto 8px',
      touchAction: 'none',
    },
  },
});
