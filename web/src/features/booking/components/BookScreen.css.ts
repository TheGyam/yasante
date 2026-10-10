import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { pressable, stateTransition } from '@/shared/ui/motion.css';

export const column = style({ maxWidth: 640, margin: '0 auto', display: 'grid', gap: space.xxl });
export const group = style({ display: 'grid', gap: space.sm });
export const chips = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });

// A service is a choice, not a link: a row you pick, with a tick where it's chosen.
export const services = style({ display: 'grid', gap: space.sm, margin: 0, padding: 0 });
export const service = style({
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  alignItems: 'center',
  gap: space.md,
  width: '100%',
  padding: `${space.md}px ${space.lg}px`,
  borderRadius: radius.lg,
  border: `1px solid ${vars.color.glass.border}`,
  background: vars.color.glass.fill,
  color: vars.color.text.primary,
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  ...pressable(0.99, stateTransition('background-color', 'border-color')),
  selectors: {
    '&[aria-checked="true"]': { borderColor: vars.color.accent, background: vars.color.accentSoft },
  },
});
export const serviceText = style({ display: 'grid', gap: 2 });
export const price = style({ fontWeight: weight.semibold, fontVariantNumeric: 'tabular-nums' });
export const tick = style({ color: vars.color.accent });
export const dot = style({ color: vars.color.text.tertiary });

export const look = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  padding: space.sm,
});
export const lookPhoto = style({
  width: 64,
  height: 80,
  borderRadius: radius.md,
  objectFit: 'cover',
  flexShrink: 0,
});

export const footer = style({ display: 'grid', gap: space.xs, textAlign: 'center' });

export const sent = style({
  maxWidth: 520,
  margin: '0 auto',
  display: 'grid',
  justifyItems: 'center',
  gap: space.lg,
  textAlign: 'center',
  padding: `${space.huge}px 0`,
});
export const sentTick = style({
  width: 96,
  height: 96,
  borderRadius: 48,
  display: 'grid',
  placeItems: 'center',
  background: vars.color.accentSoft,
  color: vars.color.accent,
});
export const actions = style({ display: 'grid', gap: space.sm, width: '100%' });
