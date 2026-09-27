import { style, styleVariants } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { stateTransition } from './motion.css';

export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  minHeight: 56,
  padding: `${space.md}px ${space.lg}px`,
});

/** A row that goes somewhere lights up under the pointer, keeping the card's corners. */
export const linked = style({
  transition: stateTransition('background-color').join(', '),
  ':hover': { background: vars.color.glass.fillStrong },
  selectors: {
    '&:first-child': { borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' },
    '&:last-child': { borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' },
  },
});

export const icon = style({
  flex: 'none',
  display: 'grid',
  placeItems: 'center',
  width: 32,
  height: 32,
  borderRadius: radius.sm,
});

export const iconTone = styleVariants({
  accent: { background: vars.color.accentSoft, color: vars.color.accent },
  neutral: { background: vars.color.glass.fillStrong, color: vars.color.text.secondary },
  success: { background: vars.color.successSoft, color: vars.color.success },
});

export const text = style({ flex: 1, minWidth: 0, display: 'grid', gap: 2 });
export const value = style({ flex: 'none', textAlign: 'right' });
