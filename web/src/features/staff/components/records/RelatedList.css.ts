import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const list = style({ display: 'grid', gap: 2, margin: 0, padding: 0, listStyle: 'none' });

export const row = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  minHeight: 44,
  padding: `0 ${space.md}px`,
  borderRadius: radius.sm,
  background: c.glass.fill,
  color: 'inherit',
  fontSize: 14,
  fontWeight: weight.medium,
  textDecoration: 'none',
  selectors: { '&:hover': { background: c.glass.fillStrong } },
});

export const chevron = style({ color: c.text.tertiary });
export const loading = style({ height: 140, borderRadius: radius.md });
