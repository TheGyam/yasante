import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { pressable, stateTransition } from '@/shared/ui/motion.css';

export const body = style({ display: 'grid', gap: space.lg });
export const refreshing = style({ opacity: 0.6 });

// The days scroll sideways, a whole day at a time, the app's strip.
export const days = style({
  display: 'flex',
  gap: space.sm,
  overflowX: 'auto',
  scrollSnapType: 'x mandatory',
  scrollbarWidth: 'none',
  paddingBottom: 2,
  selectors: { '&::-webkit-scrollbar': { display: 'none' } },
});

export const day = style({
  flex: '0 0 60px',
  scrollSnapAlign: 'start',
  display: 'grid',
  justifyItems: 'center',
  gap: 2,
  padding: `${space.sm}px 0`,
  borderRadius: radius.md,
  border: `1px solid ${vars.color.glass.border}`,
  background: vars.color.glass.fill,
  color: vars.color.text.primary,
  font: 'inherit',
  cursor: 'pointer',
  ...pressable(0.95, stateTransition('background-color', 'border-color')),
  selectors: {
    '&[aria-pressed="true"]': { borderColor: vars.color.accent, background: vars.color.accentSoft },
  },
});

export const dayName = style({ fontSize: 12, color: vars.color.text.secondary });
export const dayNumber = style({ fontSize: 20, fontWeight: weight.semibold, lineHeight: 1.2 });
export const dayMonth = style({ fontSize: 12, color: vars.color.text.tertiary });
export const on = style({ color: vars.color.accent });

export const part = style({ display: 'grid', gap: space.sm });
export const times = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });
export const skeletons = style({ display: 'flex', gap: space.sm });
