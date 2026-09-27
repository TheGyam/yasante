import { style, styleVariants } from '@vanilla-extract/css';
import { media, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { pressable, spin, stateTransition } from './motion.css';

export const button = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space.sm,
  border: 0,
  borderRadius: radius.pill,
  fontWeight: weight.semibold,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  ...pressable(0.97, stateTransition('background-color', 'opacity')),
  ':disabled': { cursor: 'default', opacity: 0.5 },
});

// Minimums, so larger text grows the button instead of clipping.
export const size = styleVariants({
  lg: { minHeight: 56, padding: `${space.sm}px ${space.xxl}px`, fontSize: '1rem' },
  md: { minHeight: 48, padding: `${space.sm}px ${space.xl}px`, fontSize: '0.9375rem' },
  sm: { minHeight: 36, padding: `${space.xs}px 14px`, fontSize: '0.875rem' },
});

export const variant = styleVariants({
  primary: {
    background: vars.color.accent,
    color: vars.color.text.onAccent,
    selectors: {
      '&:hover:not(:disabled)': {
        background: `color-mix(in srgb, ${vars.color.accent} 88%, ${vars.color.text.primary})`,
      },
    },
  },
  secondary: {
    background: vars.color.glass.fillStrong,
    color: vars.color.text.primary,
    border: `1px solid ${vars.color.glass.border}`,
    borderTopColor: vars.color.glass.highlight,
    selectors: { '&:hover:not(:disabled)': { background: vars.color.glass.fill } },
  },
  ghost: {
    background: 'transparent',
    color: vars.color.accent,
    selectors: { '&:hover:not(:disabled)': { background: vars.color.accentSoft } },
  },
});

export const fullWidth = style({ width: '100%' });

export const spinner = style({
  width: '1em',
  height: '1em',
  borderRadius: '50%',
  border: '2px solid currentColor',
  borderRightColor: 'transparent',
  animation: `${spin} 700ms linear infinite`,
  '@media': { [media.reducedMotion]: { animationDuration: '2s' } },
});
