import { style } from '@vanilla-extract/css';
import { EASE_OUT, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const group = style({ display: 'grid', gap: space.sm });
export const fields = style({ display: 'grid', gap: space.xl });
export const label = style({
  fontSize: '0.8125rem',
  fontWeight: weight.medium,
  color: vars.color.text.secondary,
});
export const chips = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });
export const status = style({ display: 'flex', alignItems: 'center', gap: 6 });

/** A choice that reads as a row: icon, title, a line under it, and a tick. */
export const option = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  padding: `${space.md}px ${space.lg}px`,
  borderRadius: radius.md,
  border: `1px solid ${vars.color.glass.border}`,
  background: vars.color.glass.fill,
  cursor: 'pointer',
  transition: `border-color ${vars.time.state} ${EASE_OUT}, background-color ${vars.time.state} ${EASE_OUT}`,
  ':hover': { background: vars.color.glass.fillStrong },
});

export const optionOn = style({
  borderColor: vars.color.accent,
  background: vars.color.accentSoft,
  ':hover': { background: vars.color.accentSoft },
});

export const optionIcon = style({
  flex: 'none',
  display: 'grid',
  placeItems: 'center',
  width: 36,
  height: 36,
  borderRadius: radius.sm,
  background: vars.color.glass.fillStrong,
  color: vars.color.text.secondary,
});

export const optionIconOn = style({
  background: vars.color.accent,
  color: vars.color.text.onAccent,
});
export const optionText = style({ flex: 1, display: 'grid', gap: 2 });
export const hidden = style({ position: 'absolute', opacity: 0, pointerEvents: 'none' });

export const photo = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
});

export const preview = style({
  width: 72,
  height: 72,
  flex: 'none',
  borderRadius: radius.md,
  objectFit: 'cover',
});

export const fieldset = style({ border: 0, padding: 0, margin: 0, minWidth: 0 });
export const block = style({ display: 'block' });
