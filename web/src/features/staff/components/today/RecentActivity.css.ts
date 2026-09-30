import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const timeline = style({
  display: 'grid',
  gap: space.md,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});
export const entry = style({ display: 'flex', gap: space.md, alignItems: 'flex-start' });

export const avatar = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 28,
  height: 28,
  borderRadius: radius.pill,
  background: c.glass.fillStrong,
  color: c.text.secondary,
  fontSize: 11,
  fontWeight: weight.bold,
  selectors: { '&[data-security="true"]': { background: c.successSoft, color: c.success } },
});

export const body = style({ display: 'grid', gap: 2, minWidth: 0 });
export const line = style({ fontSize: 13, color: c.text.secondary, overflowWrap: 'anywhere' });
export const when = style({ fontSize: 12, color: c.text.tertiary });
