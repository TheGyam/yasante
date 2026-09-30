import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const back = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  color: c.text.tertiary,
  fontSize: 13,
  textDecoration: 'none',
  selectors: { '&:hover': { color: c.text.primary } },
});

export const layout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 320px',
  gap: space.xxl,
  alignItems: 'start',
  '@media': { 'screen and (max-width: 1000px)': { gridTemplateColumns: 'minmax(0, 1fr)' } },
});

export const form = style({ display: 'grid', gap: space.lg, minWidth: 0 });

export const kinds = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: space.md,
});

export const kind = style({
  display: 'grid',
  gap: space.xs,
  alignContent: 'start',
  padding: space.lg,
  borderRadius: radius.md,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.fill,
  color: c.text.primary,
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover': { borderColor: c.glass.highlight },
    '&[aria-checked="true"]': { borderColor: c.accent, background: c.accentSoft },
  },
});

export const kindIcon = style({ color: c.accent });
export const kindTitle = style({ fontSize: 15, fontWeight: weight.semibold });
export const kindBody = style({ fontSize: 13, color: c.text.secondary, lineHeight: 1.4 });

export const filters = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: space.md,
});

export const results = style({
  display: 'grid',
  gap: 2,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  maxHeight: 240,
  overflowY: 'auto',
});

export const result = style({
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  minHeight: 40,
  padding: `0 ${space.md}px`,
  border: 0,
  borderRadius: radius.sm,
  background: c.glass.fill,
  color: c.text.primary,
  font: 'inherit',
  fontSize: 14,
  cursor: 'pointer',
  alignItems: 'center',
  selectors: {
    '&:hover:not(:disabled)': { background: c.glass.fillStrong },
    '&:disabled': { opacity: 0.5, cursor: 'default' },
  },
});

export const chips = style({ display: 'flex', flexWrap: 'wrap', gap: space.xs });

export const chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  minHeight: 28,
  padding: `0 ${space.sm}px 0 ${space.md}px`,
  borderRadius: radius.pill,
  border: 0,
  background: c.accentSoft,
  color: c.text.primary,
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
});

export const side = style({
  position: 'sticky',
  top: 80,
  display: 'grid',
  gap: space.lg,
  '@media': { 'screen and (max-width: 1000px)': { position: 'static' } },
});

export const reach = style({ gap: space.xs });
export const reachNumber = style({
  fontSize: 40,
  fontWeight: weight.bold,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
});
export const buttons = style({ display: 'grid', gap: space.sm });
