import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const dialog = style({
  width: 'min(720px, calc(100vw - 32px))',
  maxHeight: '80dvh',
  padding: space.xxl,
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.lg,
  background: c.glass.chromeSolid,
  color: c.text.primary,
  boxShadow: `0 24px 80px ${c.scrim}`,
  selectors: { '&::backdrop': { background: c.scrim } },
});

export const head = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: space.lg,
});

export const close = style({
  display: 'grid',
  placeItems: 'center',
  width: 36,
  height: 36,
  border: 0,
  borderRadius: radius.sm,
  background: 'transparent',
  color: c.text.secondary,
  cursor: 'pointer',
  selectors: { '&:hover': { background: c.glass.fillStrong } },
});

export const groups = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: space.xxl,
});
export const group = style({ display: 'grid', gap: space.sm, alignContent: 'start' });
export const line = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: space.md,
  fontSize: 14,
  color: c.text.secondary,
});
export const keys = style({ display: 'flex', gap: space.xs });
