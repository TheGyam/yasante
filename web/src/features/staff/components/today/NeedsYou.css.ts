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

export const item = style({
  display: 'grid',
  gridTemplateColumns: '120px minmax(0, 1fr) auto 16px',
  alignItems: 'center',
  gap: space.md,
  minHeight: 56,
  padding: `${space.sm}px`,
  borderRadius: radius.sm,
  color: 'inherit',
  textDecoration: 'none',
  selectors: { '&:hover': { background: c.glass.fillStrong } },
  '@media': {
    'screen and (max-width: 560px)': { gridTemplateColumns: 'minmax(0, 1fr) auto', rowGap: 2 },
  },
});

export const queue = style({
  justifySelf: 'start',
  padding: `2px ${space.sm}px`,
  borderRadius: radius.pill,
  background: c.accentSoft,
  color: c.accent,
  fontSize: 11,
  fontWeight: weight.semibold,
  whiteSpace: 'nowrap',
  '@media': { 'screen and (max-width: 560px)': { gridColumn: '1 / -1' } },
});

export const body = style({ display: 'grid', minWidth: 0 });
export const title = style({ fontSize: 14, fontWeight: weight.semibold });
export const facts = style({ fontSize: 12, color: c.text.tertiary });

export const age = style({
  fontSize: 12,
  color: c.text.tertiary,
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
  selectors: { '&[data-late="true"]': { color: c.danger, fontWeight: weight.semibold } },
});

export const arrow = style({
  color: c.text.tertiary,
  '@media': { 'screen and (max-width: 560px)': { display: 'none' } },
});

export const clear = style({
  display: 'grid',
  justifyItems: 'center',
  gap: space.xs,
  padding: `${space.xxl}px 0`,
  textAlign: 'center',
});
export const clearIcon = style({ color: c.success, marginBottom: space.xs });
