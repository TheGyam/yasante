import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const list = style({
  display: 'grid',
  margin: `0 -${space.sm}px`,
  padding: 0,
  listStyle: 'none',
});

export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  minHeight: 44,
  padding: `0 ${space.sm}px`,
  borderRadius: radius.sm,
  color: 'inherit',
  textDecoration: 'none',
  selectors: { '&:hover': { background: c.glass.fillStrong } },
});

export const name = style({
  flex: 1,
  fontSize: 14,
  fontWeight: weight.medium,
  display: 'flex',
  alignItems: 'center',
  gap: space.xs,
});
export const clear = style({ fontSize: 12, color: c.text.tertiary });
export const chevron = style({ color: c.text.tertiary, flexShrink: 0 });
export const bug = style({ color: c.danger });
export const newErrors = style({ color: c.danger, fontSize: 12 });
