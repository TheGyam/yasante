import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const codes = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: space.sm,
  margin: 0,
  padding: space.lg,
  listStylePosition: 'inside',
  borderRadius: radius.md,
  background: c.glass.fill,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 14,
});

export const form = style({ display: 'grid', gap: space.md, maxWidth: 360 });
export const label = style({
  display: 'grid',
  gap: space.xs,
  fontSize: 13,
  color: c.text.secondary,
});

export const input = style({
  height: 44,
  padding: `0 ${space.md}px`,
  borderRadius: radius.sm,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.fill,
  color: c.text.primary,
  font: 'inherit',
  fontSize: 20,
  letterSpacing: '0.3em',
  fontVariantNumeric: 'tabular-nums',
});
