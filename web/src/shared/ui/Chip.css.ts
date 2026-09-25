import { style } from '@vanilla-extract/css';
import { radius, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { pressable, stateTransition } from './motion.css';

export const chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  // A minimum, not a size: larger text grows the chip instead of clipping.
  minHeight: 36,
  padding: '6px 14px',
  borderRadius: radius.pill,
  border: `1px solid ${vars.color.glass.border}`,
  background: vars.color.glass.fill,
  color: vars.color.text.secondary,
  fontSize: '0.9375rem',
  fontWeight: weight.medium,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  ...pressable(0.96, stateTransition('background-color', 'border-color', 'color')),
  ':hover': { color: vars.color.text.primary },
});

export const selected = style({
  selectors: {
    '&, &:hover': {
      background: vars.color.accentSoft,
      borderColor: vars.color.accent,
      color: vars.color.accent,
    },
  },
});

export const inert = style({
  cursor: 'default',
  selectors: { '&:active': { transform: 'none' } },
});
