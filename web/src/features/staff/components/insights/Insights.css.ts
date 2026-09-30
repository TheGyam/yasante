import { globalStyle, style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: space.xl,
  '@media': { 'screen and (max-width: 1000px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const wide = style({ gridColumn: '1 / -1' });
export const skeleton = style({ height: 240, borderRadius: radius.md });

export const tiles = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: space.md,
});
export const tile = style({
  display: 'grid',
  gap: 2,
  padding: space.md,
  borderRadius: radius.md,
  background: c.glass.fill,
});
export const tileLabel = style({ fontSize: 12, color: c.text.tertiary });
export const tileValue = style({
  fontSize: 22,
  fontWeight: weight.bold,
  fontVariantNumeric: 'tabular-nums',
});

export const tableWrap = style({ overflowX: 'auto' });
export const table = style({ fontSize: 12, color: c.text.secondary, overflowX: 'auto' });
globalStyle(`${table} summary`, { cursor: 'pointer', color: c.text.tertiary });
globalStyle(`${table} table, ${tableWrap} table`, {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: space.sm,
});
globalStyle(`${table} th, ${table} td, ${tableWrap} th, ${tableWrap} td`, {
  padding: `${space.xs}px ${space.sm}px`,
  borderBottom: `1px solid ${c.separator}`,
  textAlign: 'left',
  fontVariantNumeric: 'tabular-nums',
});
export const number = style({ textAlign: 'right' });
