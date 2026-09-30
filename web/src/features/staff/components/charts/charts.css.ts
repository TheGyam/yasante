import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

/** Shared by every chart, so they read as one family. */
const c = vars.color;

export const chart = style({ display: 'grid', gap: space.md, minWidth: 0 });
export const plot = style({ position: 'relative', minWidth: 0 });

export const svg = style({
  display: 'block',
  overflow: 'visible',
  outline: 'none',
  touchAction: 'pan-y',
  selectors: {
    '&[data-clickable="true"]': { cursor: 'pointer' },
    '&:focus-visible': { outline: `2px solid ${c.accent}`, outlineOffset: 4, borderRadius: 8 },
  },
});

export const grid = style({ stroke: c.separator, strokeWidth: 1 });

export const axis = style({
  fill: c.text.tertiary,
  fontSize: 11,
  fontVariantNumeric: 'tabular-nums',
});

export const previous = style({
  fill: 'none',
  stroke: c.text.tertiary,
  strokeWidth: 1.5,
  strokeDasharray: '4 4',
});

export const crosshair = style({ stroke: c.text.tertiary, strokeWidth: 1, strokeDasharray: '2 3' });

export const dot = style({ transition: `r ${vars.time.pressIn}`, stroke: c.bg, strokeWidth: 2 });

export const tooltip = style({
  position: 'absolute',
  top: 0,
  transform: 'translateX(-50%)',
  zIndex: 2,
  minWidth: 160,
  padding: `${space.sm}px ${space.md}px`,
  borderRadius: radius.sm,
  background: c.glass.chromeSolid,
  border: `1px solid ${c.glass.border}`,
  boxShadow: `0 8px 24px ${c.scrim}`,
  pointerEvents: 'none',
  fontSize: 12,
  display: 'grid',
  gap: 4,
});

export const tooltipTitle = style({
  fontWeight: weight.semibold,
  color: c.text.primary,
  marginBottom: 2,
});
export const tooltipRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  fontVariantNumeric: 'tabular-nums',
});
export const tooltipName = style({ flex: 1, color: c.text.secondary });
export const tooltipHint = style({ color: c.text.tertiary, fontSize: 11, marginTop: 2 });

export const swatch = style({ width: 10, height: 10, borderRadius: 3, flexShrink: 0 });
export const swatchDashed = style({
  width: 10,
  height: 0,
  borderTop: `2px dashed ${c.text.tertiary}`,
  flexShrink: 0,
});

export const legend = style({ display: 'flex', flexWrap: 'wrap', gap: space.xs });

export const legendItem = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.sm,
  minHeight: 32,
  padding: `0 ${space.md}px`,
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.pill,
  background: 'transparent',
  color: c.text.secondary,
  font: 'inherit',
  fontSize: 12,
  fontWeight: weight.medium,
  cursor: 'pointer',
  selectors: {
    '&[aria-pressed="false"]': { opacity: 0.45, textDecoration: 'line-through' },
    '&:hover': { background: c.glass.fillStrong },
  },
});

export const bar = style({
  transition: `opacity ${vars.time.pressIn}`,
  selectors: { '&[data-dim="true"]': { opacity: 0.35 } },
});

export const barLabel = style({ fill: c.text.secondary, fontSize: 12 });
export const barValue = style({
  fill: c.text.primary,
  fontSize: 12,
  fontWeight: weight.semibold,
  fontVariantNumeric: 'tabular-nums',
});

export const cell = style({
  stroke: c.bg,
  strokeWidth: 2,
  selectors: { '&[data-active="true"]': { stroke: c.text.primary } },
});
