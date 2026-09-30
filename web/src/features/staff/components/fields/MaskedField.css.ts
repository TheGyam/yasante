import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const field = style({ display: 'grid', gap: 2, minWidth: 0 });
export const label = style({ fontSize: 12, fontWeight: weight.medium, color: c.text.tertiary });
export const value = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  minHeight: 28,
  fontSize: 14,
});
export const dots = style({ letterSpacing: '0.15em', color: c.text.secondary });
export const empty = style({ color: c.text.tertiary });
export const help = style({ fontSize: 11, color: c.text.tertiary });

export const show = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  minHeight: 28,
  padding: `0 ${space.sm}px`,
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.pill,
  background: 'transparent',
  color: c.accent,
  font: 'inherit',
  fontSize: 12,
  fontWeight: weight.semibold,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: c.accentSoft },
    '&:disabled': { opacity: 0.5, cursor: 'default' },
  },
});

export const locked = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  fontSize: 12,
  color: c.text.tertiary,
});
