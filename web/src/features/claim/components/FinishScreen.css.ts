import { style } from '@vanilla-extract/css';
import { space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const container = style({
  maxWidth: 640,
  margin: '0 auto',
  display: 'grid',
  gap: space.xl,
});

export const head = style({
  display: 'grid',
  gap: space.xs,
});

export const progress = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
});

export const section = style({
  display: 'grid',
  gap: space.md,
});

export const styleCard = style({
  display: 'grid',
  gap: space.md,
});

export const cardHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
});

export const tickedRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  color: vars.color.text.secondary,
});

export const checkIcon = style({
  color: vars.color.success,
  flexShrink: 0,
});

export const priceForm = style({
  display: 'grid',
  gap: space.md,
  paddingTop: space.sm,
});

export const doneCard = style({
  textAlign: 'center',
  display: 'grid',
  justifyItems: 'center',
  gap: space.lg,
  padding: `${space.xxl}px ${space.xl}px`,
});
