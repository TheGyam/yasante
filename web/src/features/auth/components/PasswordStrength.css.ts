import { style } from '@vanilla-extract/css';
import { EASE_OUT, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const rules = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${space.xs}px ${space.md}px`,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const rule = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: '0.75rem',
  fontWeight: weight.medium,
  color: vars.color.text.tertiary,
  transition: `color ${vars.time.state} ${EASE_OUT}`,
});

export const met = style({ color: vars.color.success });
