import { keyframes, style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;
const appear = keyframes({
  from: { opacity: 0, transform: 'translateY(-6px) scale(0.985)' },
  to: { opacity: 1, transform: 'none' },
});
const pulse = keyframes({ '50%': { opacity: 0.3 } });

export const dialog = style({
  width: 'min(640px, calc(100vw - 32px))',
  maxHeight: 'min(560px, 80dvh)',
  margin: '12dvh auto auto',
  padding: 0,
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.lg,
  background: c.glass.chromeSolid,
  backdropFilter: 'blur(28px) saturate(1.5)',
  color: c.text.primary,
  boxShadow: `0 24px 80px ${c.scrim}`,
  overflow: 'hidden',
  animation: `${appear} 180ms ${EASE_OUT}`,
  selectors: { '&::backdrop': { background: c.scrim } },
  '@media': {
    [media.reducedMotion]: { animation: 'none' },
    'screen and (max-width: 767px)': {
      width: '100vw',
      maxWidth: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      margin: 0,
      borderRadius: 0,
      border: 0,
    },
  },
});

export const box = style({
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'inherit',
  height: '100%',
});

export const field = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  padding: `0 ${space.lg}px`,
  borderBottom: `1px solid ${c.separator}`,
  '@media': { 'screen and (max-width: 767px)': { paddingTop: 'env(safe-area-inset-top)' } },
});

export const fieldIcon = style({ color: c.text.tertiary, flexShrink: 0 });

export const input = style({
  flex: 1,
  height: 56,
  border: 0,
  outline: 'none',
  background: 'transparent',
  color: c.text.primary,
  font: 'inherit',
  fontSize: 16,
  selectors: { '&::placeholder': { color: c.text.tertiary } },
});

export const searching = style({
  width: 8,
  height: 8,
  borderRadius: radius.pill,
  background: c.accent,
  animation: `${pulse} 900ms ease-in-out infinite`,
});

export const results = style({
  flex: 1,
  overflowY: 'auto',
  padding: space.sm,
  scrollbarWidth: 'thin',
});
export const group = style({ display: 'grid', gap: 1, marginBottom: space.sm });

export const groupName = style({
  padding: `${space.sm}px ${space.md}px ${space.xs}px`,
  color: c.text.tertiary,
  fontSize: 11,
  fontWeight: weight.semibold,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

export const option = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  minHeight: 44,
  padding: `${space.xs}px ${space.md}px`,
  borderRadius: radius.sm,
  cursor: 'pointer',
  selectors: { '&[aria-selected="true"]': { background: c.glass.fillStrong } },
});

export const optionIcon = style({
  display: 'grid',
  placeItems: 'center',
  width: 28,
  height: 28,
  borderRadius: 8,
  background: c.glass.fill,
  color: c.text.secondary,
  flexShrink: 0,
  selectors: {
    [`${option}[aria-selected="true"] &`]: { background: c.accentSoft, color: c.accent },
  },
});

export const optionText = style({ display: 'grid', flex: 1, minWidth: 0 });
export const optionName = style({
  fontSize: 14,
  fontWeight: weight.medium,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
export const optionSubtitle = style({
  fontSize: 12,
  color: c.text.tertiary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const optionCount = style({
  padding: '2px 8px',
  borderRadius: radius.pill,
  background: c.accent,
  color: c.text.onAccent,
  fontSize: 11,
  fontWeight: weight.bold,
});

export const optionArrow = style({ color: c.text.tertiary });

export const empty = style({
  padding: space.xxl,
  textAlign: 'center',
  color: c.text.secondary,
  fontSize: 14,
});

export const footer = style({
  display: 'flex',
  gap: space.lg,
  padding: `${space.sm}px ${space.lg}px`,
  borderTop: `1px solid ${c.separator}`,
  color: c.text.tertiary,
  fontSize: 12,
  '@media': { [media.noHover]: { display: 'none' } },
});
