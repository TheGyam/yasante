import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const filters = style({ display: 'flex', flexWrap: 'wrap', gap: space.md });

export const list = style({
  display: 'grid',
  margin: 0,
  padding: space.xs,
  listStyle: 'none',
  borderRadius: radius.lg,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.fill,
});

export const row = style({
  display: 'grid',
  gridTemplateColumns: '110px minmax(0, 1fr) auto 100px 80px',
  alignItems: 'center',
  gap: space.md,
  minHeight: 60,
  padding: `${space.sm}px ${space.md}px`,
  borderRadius: radius.sm,
  color: 'inherit',
  textDecoration: 'none',
  selectors: { '&:hover': { background: c.glass.fillStrong } },
  '@media': {
    'screen and (max-width: 767px)': {
      gridTemplateColumns: 'minmax(0, 1fr) auto',
      rowGap: space.xs,
    },
  },
});

export const where = style({
  fontSize: 12,
  fontWeight: weight.semibold,
  color: c.text.secondary,
  '@media': { 'screen and (max-width: 767px)': { gridColumn: '1 / -1' } },
});

export const main = style({ display: 'grid', gap: 2, minWidth: 0 });
export const title = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
  fontWeight: weight.semibold,
});
export const meta = style({ fontSize: 12, color: c.text.tertiary });
export const pills = style({ display: 'flex', gap: space.xs });
export const trend = style({ '@media': { 'screen and (max-width: 767px)': { display: 'none' } } });
export const when = style({
  fontSize: 12,
  color: c.text.tertiary,
  textAlign: 'right',
  whiteSpace: 'nowrap',
});
export const pager = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: space.xs,
});
export const skeleton = style({ height: 360, borderRadius: radius.lg });
