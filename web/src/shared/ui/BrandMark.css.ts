import { style } from '@vanilla-extract/css';
import { radius, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const mark = style({ display: 'inline-flex', alignItems: 'center', gap: 10 });

export const tile = style({
  display: 'grid',
  placeItems: 'center',
  width: 34,
  height: 34,
  borderRadius: radius.sm,
  background: vars.color.accent,
  color: vars.color.text.onAccent,
  fontSize: 19,
  fontWeight: weight.bold,
  lineHeight: 1,
});

export const word = style({
  fontSize: 20,
  fontWeight: weight.bold,
  letterSpacing: '-0.02em',
  lineHeight: 1,
});
