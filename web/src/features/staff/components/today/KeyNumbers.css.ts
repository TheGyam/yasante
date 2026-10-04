import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: space.lg,
});

export const tile = style({
  display: 'grid',
  gap: space.xs,
  padding: space.xl,
  borderRadius: radius.lg,
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
  borderTopColor: c.glass.highlight,
  color: 'inherit',
  textDecoration: 'none',
  transition: `border-color ${vars.time.pressIn}, transform ${vars.time.pressIn}`,
  selectors: {
    '&:hover': { borderColor: c.accent },
    '&:active': { transform: 'scale(0.99)' },
  },
});

export const label = style({ fontSize: 13, fontWeight: weight.medium, color: c.text.secondary });

export const value = style({
  fontSize: 34,
  lineHeight: 1.1,
  fontWeight: weight.bold,
  letterSpacing: '-0.03em',
  fontVariantNumeric: 'tabular-nums',
});

export const foot = style({
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: space.sm,
  marginTop: space.xs,
});

export const change = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  padding: `2px ${space.sm}px`,
  borderRadius: radius.pill,
  fontSize: 11,
  fontWeight: weight.semibold,
  background: c.glass.fillStrong,
  color: c.text.secondary,
  whiteSpace: 'nowrap',
  selectors: {
    '&[data-tone="up"]': { background: c.successSoft, color: c.success },
    '&[data-tone="down"]': { background: c.dangerSoft, color: c.danger },
  },
});
