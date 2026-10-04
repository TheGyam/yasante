import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

/** The workspace's shared layout pieces, so every screen has the same rhythm. */
const c = vars.color;

export const page = style({ display: 'grid', gap: space.xxl, minWidth: 0 });

export const header = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: space.lg,
});

export const heading = style({ display: 'grid', gap: space.xs, minWidth: 0 });

export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: space.sm,
});

export const card = style({
  display: 'grid',
  alignContent: 'start',
  gap: space.lg,
  minWidth: 0,
  padding: space.xl,
  borderRadius: radius.lg,
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
  borderTopColor: c.glass.highlight,
});

export const cardHeader = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: space.md,
});

export const row = style({ display: 'flex', alignItems: 'center', gap: space.sm, minWidth: 0 });
export const stack = style({ display: 'grid', gap: space.sm, minWidth: 0 });
export const grow = style({ flex: 1, minWidth: 0 });

export const muted = style({ color: c.text.secondary, fontSize: 13 });

export const count = style({
  display: 'inline-grid',
  placeItems: 'center',
  minWidth: 20,
  height: 20,
  padding: `0 ${space.xs + 2}px`,
  borderRadius: radius.pill,
  background: c.glass.fillStrong,
  color: c.text.secondary,
  fontSize: 11,
  fontWeight: weight.semibold,
  fontVariantNumeric: 'tabular-nums',
});

export const urgent = style({ background: c.accent, color: c.text.onAccent });

export const tabular = style({ fontVariantNumeric: 'tabular-nums' });

export const truncate = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
});

export const iconTile = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 36,
  height: 36,
  borderRadius: radius.sm,
  background: c.accentSoft,
  color: c.accent,
});

export const divider = style({ borderTop: `1px solid ${c.separator}` });

export const link = style({
  color: c.accent,
  fontWeight: weight.medium,
  textDecoration: 'none',
  selectors: { '&:hover': { textDecoration: 'underline', textUnderlineOffset: 3 } },
});
