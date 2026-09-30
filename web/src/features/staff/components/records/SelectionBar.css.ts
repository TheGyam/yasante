import { keyframes, style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;
const rise = keyframes({
  from: { opacity: 0, transform: 'translate(-50%, 12px)' },
  to: { opacity: 1, transform: 'translate(-50%, 0)' },
});

export const bar = style({
  position: 'fixed',
  zIndex: 25,
  left: '50%',
  bottom: `max(${space.xxl}px, env(safe-area-inset-bottom))`,
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  maxWidth: 'calc(100vw - 32px)',
  padding: `${space.sm}px ${space.sm}px ${space.sm}px ${space.lg}px`,
  borderRadius: radius.pill,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.chromeSolid,
  backdropFilter: 'blur(24px) saturate(1.4)',
  boxShadow: `0 16px 48px ${c.scrim}`,
  animation: `${rise} 220ms ${EASE_OUT}`,
  '@media': {
    [media.reducedMotion]: { animation: 'none' },
    'screen and (max-width: 767px)': {
      bottom: 'calc(76px + env(safe-area-inset-bottom))',
      flexWrap: 'wrap',
      borderRadius: radius.lg,
    },
  },
});

export const count = style({ fontSize: 14, fontWeight: weight.semibold, whiteSpace: 'nowrap' });

export const link = style({
  border: 0,
  background: 'transparent',
  color: c.accent,
  font: 'inherit',
  fontSize: 13,
  fontWeight: weight.medium,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

export const divider = style({ width: 1, height: 20, background: c.separator });
