import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const items = style({ display: 'grid', minWidth: 200 });

export const item = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  minHeight: 40,
  padding: `0 ${space.md}px`,
  border: 0,
  borderRadius: radius.sm,
  background: 'transparent',
  color: c.text.primary,
  font: 'inherit',
  fontSize: 14,
  fontWeight: weight.medium,
  textAlign: 'left',
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: {
    '&:hover, &:focus-visible': { background: c.glass.fillStrong, outline: 'none' },
    '&:disabled': { opacity: 0.45, cursor: 'default' },
  },
});

export const danger = style({ color: c.danger });
export const label = style({ flex: 1 });
export const hint = style({ color: c.text.tertiary, fontSize: 12 });
export const separator = style({
  border: 0,
  borderTop: `1px solid ${c.separator}`,
  margin: `${space.xs}px 0`,
});
