import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { globalStyle, style } from '@vanilla-extract/css';

const c = vars.color;
export const shell = style({
  display: 'grid',
  gridTemplateColumns: '248px minmax(0, 1fr)',
  minHeight: '100dvh',
  '@media': { '(max-width: 900px)': { gridTemplateColumns: '1fr' } },
});
export const sidebar = style({
  position: 'sticky',
  top: 0,
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  gap: space.xxl,
  padding: '32px 20px 20px',
  borderRight: `1px solid ${c.separator}`,
  background: c.glass.fill,
  overflowY: 'auto',
  '@media': {
    '(max-width: 900px)': {
      position: 'relative',
      height: 'auto',
      padding: space.lg,
      borderRight: 0,
      borderBottom: `1px solid ${c.separator}`,
      gap: space.md,
    },
  },
});
export const nav = style({ display: 'grid', gap: space.xs });
export const sidebarBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: space.xxl,
  flex: 1,
  '@media': {
    '(max-width: 900px)': {
      display: 'none',
      selectors: { '&[data-open="true"]': { display: 'flex' } },
    },
  },
});
export const navLink = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  padding: '12px 14px',
  minHeight: 44,
  borderRadius: radius.sm,
  fontSize: 14,
  fontWeight: weight.medium,
  color: c.text.secondary,
  selectors: {
    '&:hover': { background: c.glass.fillStrong, color: c.text.primary },
    '&[aria-current="page"]': { background: c.accentSoft, color: c.accent },
  },
});
export const sidebarFoot = style({ marginTop: 'auto', display: 'grid', gap: space.md });
export const main = style({ minWidth: 0 });
export const topbar = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.lg,
  minHeight: 88,
  padding: '20px 40px',
  borderBottom: `1px solid ${c.separator}`,
  '@media': { '(max-width: 640px)': { padding: space.lg } },
});
export const content = style({
  maxWidth: 1560,
  margin: '0 auto',
  padding: '36px 40px 48px',
  display: 'grid',
  gap: space.xxxl,
  '@media': { '(max-width: 640px)': { padding: '24px 16px' } },
});
export const row = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: space.md,
});
export const between = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: space.lg,
});
export const stack = style({ display: 'grid', gap: space.sm });
export const eyebrow = style({
  color: c.text.secondary,
  fontSize: 11,
  fontWeight: weight.semibold,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
});
export const tag = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.sm,
  borderRadius: radius.pill,
  padding: '6px 10px',
  background: c.accentSoft,
  color: c.accent,
  fontSize: 12,
  fontWeight: weight.medium,
});
export const metrics = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: space.lg,
});
export const card = style({
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.lg,
  padding: space.xxl,
  minWidth: 0,
});
export const metric = style({
  display: 'grid',
  gap: space.lg,
  selectors: { '&:hover': { borderColor: c.accent } },
});
export const number = style({
  fontSize: '2.5rem',
  fontWeight: weight.semibold,
  letterSpacing: '-0.05em',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
});
export const split = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
  gap: space.xxl,
  '@media': { '(max-width: 1150px)': { gridTemplateColumns: '1fr' } },
});
export const queue = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.lg,
  padding: '18px 0',
  borderBottom: `1px solid ${c.separator}`,
  selectors: { '&:last-child': { borderBottom: 0 }, '&:hover': { color: c.accent } },
});
export const count = style({
  minWidth: 38,
  height: 38,
  display: 'grid',
  placeItems: 'center',
  borderRadius: radius.sm,
  background: c.warningSoft,
  color: c.warning,
  fontVariantNumeric: 'tabular-nums',
  fontWeight: weight.semibold,
});
export const grow = style({ flex: 1, minWidth: 0 });
export const muted = style({ color: c.text.secondary, fontSize: 13 });
export const button = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space.sm,
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.sm,
  padding: '10px 14px',
  minHeight: 44,
  background: c.glass.fillStrong,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: weight.medium,
  selectors: {
    '&:hover': { borderColor: c.accent, color: c.accent },
    '&:active': { transform: 'scale(0.98)' },
    '&:disabled': { opacity: 0.45, cursor: 'default' },
  },
});
export const menuToggle = style([
  button,
  {
    display: 'none',
    '@media': { '(max-width: 900px)': { display: 'inline-flex' } },
  },
]);
export const command = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  minWidth: 240,
  padding: '10px 14px',
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.sm,
  background: c.glass.fill,
  color: c.text.secondary,
  cursor: 'pointer',
  minHeight: 44,
});
export const chart = style({ width: '100%', height: 220, color: c.accent, marginTop: space.xxl });
export const chartSecond = style({ color: c.gold });
export const legend = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.xl,
  fontSize: 13,
  marginTop: space.xl,
  color: c.accent,
});
export const dot = style({
  width: 8,
  height: 8,
  borderRadius: radius.pill,
  background: 'currentColor',
  display: 'inline-block',
});
export const tools = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: space.lg,
});
export const toolLink = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: space.md,
  minHeight: 44,
  padding: '10px 0',
  borderBottom: `1px solid ${c.separator}`,
  selectors: { '&:hover': { color: c.accent } },
});
globalStyle(`${shell} input[type="checkbox"]`, {
  accentColor: c.accent,
  width: 18,
  height: 18,
  flexShrink: 0,
});
globalStyle(`${shell} :where(input, textarea, select)`, { scrollMarginBottom: 100 });
globalStyle(`${shell} fieldset`, { border: 0, padding: 0, margin: 0, minWidth: 0 });

export * from './controls.css';
