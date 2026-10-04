import { globalStyle, style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const loading = style({ height: 420, borderRadius: radius.lg });

export const tiles = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: space.lg,
});

export const tile = style({
  display: 'grid',
  gap: space.xs,
  padding: space.xl,
  borderRadius: radius.lg,
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
});

export const tileLabel = style({ fontSize: 13, color: c.text.secondary });
export const tileValue = style({
  fontSize: 30,
  fontWeight: weight.bold,
  fontVariantNumeric: 'tabular-nums',
});

export const tableWrap = style({
  overflowX: 'auto',
  borderRadius: radius.lg,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.fill,
});

export const table = style({ width: '100%', borderCollapse: 'collapse', fontSize: 13 });
globalStyle(`${table} th, ${table} td`, {
  padding: `${space.sm}px ${space.md}px`,
  borderBottom: `1px solid ${c.separator}`,
  whiteSpace: 'nowrap',
  textAlign: 'left',
});
globalStyle(`${table} thead th`, {
  color: c.text.tertiary,
  fontSize: 12,
  fontWeight: weight.semibold,
});
globalStyle(`${table} tbody th`, { fontWeight: weight.medium });

export const number = style({
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  color: c.text.secondary,
  selectors: { '&[data-current="true"]': { color: c.text.primary, fontWeight: weight.semibold } },
});
globalStyle(`${table} ${number}`, { textAlign: 'right' });
