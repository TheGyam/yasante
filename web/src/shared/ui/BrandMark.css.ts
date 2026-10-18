import { style } from '@vanilla-extract/css';
import { weight } from '@/shared/theme/tokens';

export const mark = style({ display: 'inline-flex', alignItems: 'center', gap: 10 });

// The corners a home screen gives the app icon.
export const tile = style({
  display: 'block',
  width: 34,
  height: 34,
  flexShrink: 0,
  borderRadius: 8,
});

export const word = style({
  fontSize: 20,
  fontWeight: weight.bold,
  letterSpacing: '-0.02em',
  lineHeight: 1,
});
