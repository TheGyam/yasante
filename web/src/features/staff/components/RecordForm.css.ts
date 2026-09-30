import { keyframes, style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;
const rise = keyframes({
  from: { opacity: 0, transform: 'translateY(12px)' },
  to: { opacity: 1, transform: 'none' },
});

export const stack = style({ display: 'grid', gap: space.lg, minWidth: 0 });
export const modeBar = style({
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  minHeight: 36,
});

export const saveBar = style({
  position: 'sticky',
  bottom: space.lg,
  zIndex: 5,
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  padding: `${space.sm}px ${space.sm}px ${space.sm}px ${space.lg}px`,
  borderRadius: radius.pill,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.chromeSolid,
  backdropFilter: 'blur(24px) saturate(1.4)',
  boxShadow: `0 12px 40px ${c.scrim}`,
  animation: `${rise} 200ms ${EASE_OUT}`,
  '@media': {
    [media.reducedMotion]: { animation: 'none' },
    'screen and (max-width: 767px)': { bottom: 'calc(72px + env(safe-area-inset-bottom))' },
  },
  selectors: { '&[data-panel="true"]': { bottom: space.md } },
});

export const saveText = style({ flex: 1 });

export const danger = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
  padding: space.xl,
  borderRadius: radius.lg,
  border: `1px solid color-mix(in srgb, ${c.danger} 35%, transparent)`,
  background: c.dangerSoft,
});

export const sectionSkeleton = style({ height: 180, borderRadius: radius.lg });
