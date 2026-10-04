import { globalStyle, style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const sidebar = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  padding: `${space.lg}px ${space.md}px ${space.md}px`,
  gap: space.lg,
});

export const brand = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.sm,
  minHeight: 40,
  paddingLeft: space.sm,
  selectors: {
    [`${sidebar}[data-rail="true"] &`]: { flexDirection: 'column', paddingLeft: 0 },
  },
});

export const brandLink = style({ display: 'flex', borderRadius: radius.sm });

// The wordmark hides in the rail; the mark alone stays.
globalStyle(`${sidebar}[data-rail="true"] ${brandLink} span:not(:first-child)`, {
  display: 'none',
});

export const railToggle = style({
  display: 'grid',
  placeItems: 'center',
  width: 32,
  height: 32,
  border: 0,
  borderRadius: radius.sm,
  background: 'transparent',
  color: c.text.tertiary,
  cursor: 'pointer',
  selectors: { '&:hover': { background: c.glass.fillStrong, color: c.text.primary } },
  '@media': { 'screen and (max-width: 767px)': { display: 'none' } },
});

export const sections = style({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'grid',
  alignContent: 'start',
  gap: space.lg,
  marginInline: -space.xs,
  paddingInline: space.xs,
  scrollbarWidth: 'thin',
});

export const section = style({ display: 'grid', gap: 1 });

export const label = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.xs,
  padding: `${space.xs}px ${space.sm}px`,
  color: c.text.tertiary,
  fontSize: 11,
  fontWeight: weight.semibold,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  selectors: {
    [`${sidebar}[data-rail="true"] &`]: { visibility: 'hidden', height: 1, padding: 0 },
  },
});

export const labelButton = style({
  border: 0,
  background: 'transparent',
  font: 'inherit',
  cursor: 'pointer',
  width: '100%',
  selectors: { '&:hover': { color: c.text.secondary } },
});

export const chevron = style({
  transition: `transform ${vars.time.state}`,
  selectors: { [`${labelButton}[aria-expanded="true"] &`]: { transform: 'rotate(90deg)' } },
});

export const item = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  minHeight: 36,
  padding: `0 ${space.sm}px`,
  borderRadius: radius.sm,
  color: c.text.secondary,
  fontSize: 14,
  fontWeight: weight.medium,
  textDecoration: 'none',
  transition: `background-color ${vars.time.pressIn}, color ${vars.time.pressIn}`,
  selectors: {
    '&:hover': { background: c.glass.fillStrong, color: c.text.primary },
    '&[aria-current="page"]': { background: c.accentSoft, color: c.text.primary },
    [`${sidebar}[data-rail="true"] &`]: { justifyContent: 'center', padding: 0, minHeight: 40 },
  },
});

export const icon = style({
  flexShrink: 0,
  selectors: { [`${item}[aria-current="page"] &`]: { color: c.accent } },
});

export const name = style({
  flex: 1,
  selectors: { [`${sidebar}[data-rail="true"] &`]: { display: 'none' } },
});

export const badge = style({
  selectors: {
    [`${sidebar}[data-rail="true"] &`]: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      fontSize: 9,
      padding: '0 4px',
    },
  },
});

export const footer = style({
  paddingTop: space.md,
  borderTop: `1px solid ${c.separator}`,
});
