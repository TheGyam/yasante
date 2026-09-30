import { globalStyle, style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const back = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  color: c.text.tertiary,
  fontSize: 13,
  textDecoration: 'none',
  selectors: { '&:hover': { color: c.text.primary } },
});

export const title = style({ fontFamily: MONO, overflowWrap: 'anywhere' });

export const version = style({
  height: 36,
  width: 200,
  padding: `0 ${space.md}px`,
  borderRadius: radius.sm,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.fill,
  color: c.text.primary,
  font: 'inherit',
  fontSize: 14,
});

export const stats = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: space.md,
});

export const stat = style({
  display: 'grid',
  gap: 2,
  padding: space.lg,
  borderRadius: radius.md,
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
});

export const statLabel = style({ fontSize: 12, color: c.text.tertiary });
export const statValue = style({
  fontSize: 20,
  fontWeight: weight.bold,
  fontVariantNumeric: 'tabular-nums',
});

export const stack = style({
  margin: 0,
  maxHeight: 360,
  overflow: 'auto',
  padding: space.lg,
  borderRadius: radius.sm,
  background: c.bg,
  border: `1px solid ${c.separator}`,
  fontFamily: MONO,
  fontSize: 12,
  lineHeight: 1.6,
  whiteSpace: 'pre',
});

export const tableWrap = style({ overflowX: 'auto' });
export const table = style({ width: '100%', borderCollapse: 'collapse', fontSize: 13 });
globalStyle(`${table} th`, {
  textAlign: 'left',
  padding: `${space.sm}px`,
  color: c.text.tertiary,
  fontSize: 12,
  fontWeight: weight.semibold,
  borderBottom: `1px solid ${c.separator}`,
});
globalStyle(`${table} td`, {
  padding: `${space.sm}px`,
  borderBottom: `1px solid ${c.separator}`,
  color: c.text.secondary,
  whiteSpace: 'nowrap',
});
export const mono = style({ fontFamily: MONO, fontSize: 12 });
export const skeleton = style({ height: 480, borderRadius: radius.lg });
