import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const funnel = style({
  display: 'grid',
  gap: space.xs,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});
export const step = style({ display: 'grid', gap: space.xs });

export const row = style({
  display: 'grid',
  gridTemplateColumns: '120px minmax(0, 1fr) 96px 16px',
  alignItems: 'center',
  gap: space.md,
  minHeight: 44,
  padding: `0 ${space.sm}px`,
  borderRadius: radius.sm,
  color: 'inherit',
  textDecoration: 'none',
  selectors: { '&[href]:hover': { background: c.glass.fillStrong } },
  '@media': {
    'screen and (max-width: 560px)': { gridTemplateColumns: '90px minmax(0, 1fr) 72px 16px' },
  },
});

export const label = style({ fontSize: 14, fontWeight: weight.medium });

export const track = style({
  height: 28,
  borderRadius: radius.sm,
  background: c.glass.fill,
  overflow: 'hidden',
});

export const fill = style({
  display: 'block',
  height: '100%',
  borderRadius: radius.sm,
  background: `linear-gradient(90deg, ${c.accent}, color-mix(in srgb, ${c.accent} 70%, ${c.gold}))`,
});

export const value = style({
  display: 'grid',
  justifyItems: 'end',
  fontSize: 15,
  fontWeight: weight.semibold,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.2,
});

export const share = style({ fontSize: 11, fontWeight: weight.medium, color: c.text.tertiary });
export const chevron = style({ color: c.text.tertiary });

export const drop = style({
  justifySelf: 'start',
  marginLeft: 132,
  padding: `2px ${space.sm}px`,
  borderRadius: radius.pill,
  background: c.glass.fill,
  color: c.text.secondary,
  fontSize: 11,
  fontWeight: weight.medium,
  selectors: { '&[data-bad="true"]': { background: c.dangerSoft, color: c.danger } },
  '@media': { 'screen and (max-width: 560px)': { marginLeft: 0 } },
});
