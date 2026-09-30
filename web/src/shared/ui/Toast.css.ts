import { keyframes, style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;
const rise = keyframes({
  from: { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
  to: { opacity: 1, transform: 'none' },
});

export const region = style({
  position: 'fixed',
  zIndex: 1000,
  right: space.xxl,
  bottom: `max(${space.xxl}px, env(safe-area-inset-bottom))`,
  display: 'grid',
  gap: space.sm,
  justifyItems: 'end',
  pointerEvents: 'none',
  '@media': {
    'screen and (max-width: 767px)': {
      left: space.lg,
      right: space.lg,
      justifyItems: 'stretch',
      bottom: 'calc(76px + env(safe-area-inset-bottom))',
    },
  },
});

export const notice = style({
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  minHeight: 48,
  maxWidth: 480,
  padding: `${space.sm}px ${space.sm}px ${space.sm}px ${space.lg}px`,
  borderRadius: radius.md,
  background: c.text.primary,
  color: c.bg,
  boxShadow: `0 12px 40px ${c.scrim}`,
  fontSize: 14,
  fontWeight: weight.medium,
  animation: `${rise} 220ms ${EASE_OUT}`,
  '@media': { [media.reducedMotion]: { animation: 'none' } },
});

export const danger = style({ background: c.danger, color: c.text.onAccent });
export const message = style({ flex: 1 });

export const action = style({
  border: 0,
  borderRadius: radius.sm,
  padding: `${space.xs}px ${space.md}px`,
  minHeight: 32,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: weight.bold,
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  cursor: 'pointer',
});

export const dismiss = style({
  display: 'grid',
  placeItems: 'center',
  width: 32,
  height: 32,
  border: 0,
  borderRadius: radius.sm,
  background: 'transparent',
  color: 'inherit',
  opacity: 0.7,
  cursor: 'pointer',
  selectors: { '&:hover': { opacity: 1 } },
});
