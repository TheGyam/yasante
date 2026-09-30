import { globalStyle, style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;
const phone = 'screen and (max-width: 767px)';

export const wrap = style({
  minWidth: 0,
  overflowX: 'auto',
  borderRadius: radius.lg,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.fill,
  '@media': { [phone]: { overflow: 'visible', border: 0, background: 'transparent' } },
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
  '@media': { [phone]: { display: 'block' } },
});

globalStyle(`${table} thead th`, {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  height: 40,
  padding: `0 ${space.md}px`,
  background: c.glass.chromeSolid,
  borderBottom: `1px solid ${c.separator}`,
  color: c.text.tertiary,
  fontSize: 12,
  fontWeight: weight.semibold,
  textAlign: 'left',
  whiteSpace: 'nowrap',
});
globalStyle(`${table} thead`, { '@media': { [phone]: { display: 'none' } } });
globalStyle(`${table} tbody`, { '@media': { [phone]: { display: 'grid', gap: space.sm } } });

export const sort = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  padding: 0,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
  selectors: { '&:hover': { color: c.text.primary } },
});

export const row = style({
  height: 44,
  cursor: 'pointer',
  borderBottom: `1px solid ${c.separator}`,
  transition: `background-color ${vars.time.pressIn}`,
  selectors: {
    '&:last-child': { borderBottom: 0 },
    '&:hover, &[data-active="true"]': { background: c.glass.fillStrong },
    '&[data-selected="true"]': { background: c.accentSoft },
  },
  '@media': {
    [phone]: {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: `${space.xs}px ${space.sm}px`,
      height: 'auto',
      padding: space.lg,
      borderRadius: radius.lg,
      border: `1px solid ${c.glass.border}`,
      background: c.glass.fill,
    },
  },
});

globalStyle(`${row} td`, {
  padding: `0 ${space.md}px`,
  maxWidth: 320,
  '@media': { [phone]: { padding: 0, maxWidth: 'none', gridColumn: '1 / -1' } },
});

export const first = style({
  '@media': { [phone]: { order: -1 } },
});

export const cell = style({
  color: c.text.secondary,
  '@media': {
    [phone]: {
      display: 'flex',
      gap: space.sm,
      fontSize: 13,
      selectors: {
        '&::before': { content: 'attr(data-label)', color: c.text.tertiary, minWidth: 96 },
      },
    },
  },
});

export const title = style({
  display: 'block',
  maxWidth: 320,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: c.text.primary,
  fontWeight: weight.semibold,
  textDecoration: 'none',
  selectors: { '&:hover': { color: c.accent } },
  '@media': { [phone]: { fontSize: 15, maxWidth: 'none', whiteSpace: 'normal' } },
});

export const check = style({
  width: 40,
  '@media': { [phone]: { display: 'none' } },
});

export const box = style({
  width: 16,
  height: 16,
  accentColor: c.accent,
  cursor: 'pointer',
  opacity: 0,
  transition: `opacity ${vars.time.pressIn}`,
  selectors: {
    [`${row}:hover &, &:checked, &:focus-visible, ${wrap}[data-selecting="true"] &`]: {
      opacity: 1,
    },
    'thead &': { opacity: 1 },
  },
});

// A phone card shows the title and the next few fields; the full record is a tap away.
globalStyle(`${cell}:nth-child(n+6)`, { '@media': { [phone]: { display: 'none' } } });
