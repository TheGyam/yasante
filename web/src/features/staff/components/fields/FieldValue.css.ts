import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const field = style({
  display: 'grid',
  gap: 2,
  minWidth: 0,
  selectors: { '&[data-wide="true"]': { gridColumn: '1 / -1' } },
});

export const label = style({ fontSize: 12, fontWeight: weight.medium, color: c.text.tertiary });

export const value = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.xs,
  minHeight: 24,
  fontSize: 14,
  color: c.text.primary,
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
});

export const empty = style({ color: c.text.tertiary });
export const help = style({ fontSize: 12, color: c.text.tertiary });
export const link = style({ color: c.accent });

export const copy = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 24,
  height: 24,
  border: 0,
  borderRadius: radius.sm,
  background: 'transparent',
  color: c.text.tertiary,
  cursor: 'pointer',
  selectors: { '&:hover': { background: c.glass.fillStrong, color: c.text.primary } },
});
