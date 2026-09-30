import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const bar = style({ display: 'grid', gap: space.sm });
export const controls = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  flexWrap: 'wrap',
});

export const search = style({
  position: 'relative',
  flex: '1 1 260px',
  maxWidth: 420,
  display: 'flex',
  alignItems: 'center',
});

export const searchIcon = style({
  position: 'absolute',
  left: space.md,
  color: c.text.tertiary,
  pointerEvents: 'none',
});

export const input = style({
  width: '100%',
  height: 36,
  padding: `0 ${space.md}px 0 36px`,
  borderRadius: radius.sm,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.fill,
  color: c.text.primary,
  font: 'inherit',
  fontSize: 14,
  selectors: {
    '&::placeholder': { color: c.text.tertiary },
    '&:focus': { outline: `2px solid ${c.accent}`, outlineOffset: 1 },
  },
  '@media': { 'screen and (max-width: 767px)': { fontSize: 16, height: 44 } },
});

export const badge = style({
  display: 'inline-grid',
  placeItems: 'center',
  minWidth: 18,
  height: 18,
  borderRadius: radius.pill,
  background: c.accent,
  color: c.text.onAccent,
  fontSize: 11,
  fontWeight: weight.bold,
});

export const panel = style({
  display: 'grid',
  gap: space.md,
  padding: space.sm,
  width: 'min(360px, calc(100vw - 48px))',
});
export const group = style({ border: 0, margin: 0, padding: 0, display: 'grid', gap: space.xs });
export const legend = style({
  padding: 0,
  marginBottom: space.xs,
  fontSize: 11,
  fontWeight: weight.semibold,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: c.text.tertiary,
});
export const options = style({ display: 'flex', flexWrap: 'wrap', gap: space.xs });

export const option = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  minHeight: 32,
  padding: `0 ${space.md}px`,
  borderRadius: radius.pill,
  border: `1px solid ${c.glass.border}`,
  background: 'transparent',
  color: c.text.secondary,
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: c.glass.fillStrong, color: c.text.primary },
    '&[aria-pressed="true"]': {
      background: c.accentSoft,
      borderColor: 'transparent',
      color: c.text.primary,
      fontWeight: weight.semibold,
    },
  },
});

export const chips = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: space.xs,
});

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
  fontWeight: weight.medium,
  cursor: 'pointer',
  selectors: { '&:hover': { background: c.glass.fillStrong } },
});

export const clear = style({
  border: 0,
  background: 'transparent',
  color: c.text.tertiary,
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
});
