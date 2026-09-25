import { style } from '@vanilla-extract/css';
import { space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const header = style({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: space.lg,
  margin: `${space.huge}px 0 ${space.lg}px`,
});

export const action = style({
  color: vars.color.accent,
  fontSize: '0.9375rem',
  fontWeight: weight.medium,
  whiteSpace: 'nowrap',
  ':hover': { textDecoration: 'underline' },
});
