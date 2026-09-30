import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { media, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;
const spin = keyframes({ to: { transform: 'rotate(360deg)' } });

export const bar = style({
  position: 'sticky',
  top: 0,
  zIndex: 20,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(200px, 420px) minmax(0, 1fr)',
  alignItems: 'center',
  gap: space.lg,
  height: 56,
  padding: `0 ${space.xxl}px`,
  background: c.glass.chromeTint,
  backdropFilter: 'blur(20px) saturate(1.4)',
  borderBottom: `1px solid ${c.separator}`,
  '@media': {
    'screen and (max-width: 767px)': {
      gridTemplateColumns: 'minmax(0, 1fr) auto',
      padding: `0 ${space.lg}px`,
      paddingTop: 'env(safe-area-inset-top)',
      height: 'calc(52px + env(safe-area-inset-top))',
    },
  },
});

export const crumbs = style({ minWidth: 0 });
export const list = style({
  display: 'flex',
  alignItems: 'center',
  margin: 0,
  padding: 0,
  listStyle: 'none',
  minWidth: 0,
});

export const crumb = style({
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
  color: c.text.tertiary,
  fontSize: 14,
  selectors: {
    '&[aria-current="page"]': { color: c.text.primary, fontWeight: weight.semibold },
  },
  '@media': {
    'screen and (max-width: 767px)': {
      selectors: { '&:not([aria-current="page"])': { display: 'none' } },
    },
  },
});

export const crumbText = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
export const separator = style({ margin: `0 ${space.xs}px`, flexShrink: 0 });

export const search = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  height: 36,
  padding: `0 ${space.sm}px 0 ${space.md}px`,
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.sm,
  background: c.glass.fill,
  color: c.text.tertiary,
  font: 'inherit',
  fontSize: 14,
  cursor: 'text',
  transition: `border-color ${vars.time.pressIn}`,
  selectors: { '&:hover': { borderColor: c.glass.highlight, color: c.text.secondary } },
  '@media': { 'screen and (max-width: 767px)': { display: 'none' } },
});

export const placeholder = style({
  flex: 1,
  textAlign: 'left',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
});

export const actions = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: space.xs,
});

export const iconButton = style({ width: 36, paddingInline: 0 });

export const spinning = style({});
globalStyle(`${spinning} svg`, {
  animation: `${spin} 900ms linear infinite`,
  '@media': { [media.reducedMotion]: { animation: 'none' } },
});
