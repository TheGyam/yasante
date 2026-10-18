import { keyframes, style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;
const enter = keyframes({
  from: { opacity: 0, transform: 'translateX(12px)' },
  to: { opacity: 1, transform: 'none' },
});

export const detail = style({
  gap: space.lg,
  animation: `${enter} 220ms ${EASE_OUT}`,
  '@media': { [media.reducedMotion]: { animation: 'none' } },
});

export const head = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: space.md,
});

export const facts = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.xs,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const fact = style({
  padding: `3px ${space.sm}px`,
  borderRadius: radius.pill,
  background: c.glass.fillStrong,
  color: c.text.secondary,
  fontSize: 12,
  fontWeight: weight.medium,
});

export const quote = style({
  margin: 0,
  padding: `${space.md}px ${space.lg}px`,
  borderLeft: `3px solid ${c.accent}`,
  borderRadius: `0 ${radius.sm}px ${radius.sm}px 0`,
  background: c.glass.fill,
  fontSize: 15,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
});

export const content = style({
  display: 'grid',
  gap: space.xs,
  padding: space.lg,
  borderRadius: radius.md,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.fill,
});

export const images = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: space.md,
  selectors: {
    '&[data-pair="true"]': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    '&[data-grid="true"]': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  },
});

export const figure = style({ margin: 0, display: 'grid', gap: space.xs });

export const image = style({
  width: '100%',
  maxHeight: 420,
  objectFit: 'contain',
  borderRadius: radius.md,
  background: c.glass.fill,
});

export const caption = style({ fontSize: 12, color: c.text.tertiary, textAlign: 'center' });

export const decide = style({
  display: 'grid',
  gap: space.md,
  paddingTop: space.lg,
  borderTop: `1px solid ${c.separator}`,
  '@media': {
    'screen and (max-width: 767px)': {
      position: 'sticky',
      bottom: 'calc(64px + env(safe-area-inset-bottom))',
      background: c.glass.chromeSolid,
      margin: `0 -${space.xl}px -${space.xl}px`,
      padding: space.lg,
      borderRadius: `${radius.lg}px ${radius.lg}px 0 0`,
    },
  },
});

export const noteLabel = style({
  display: 'grid',
  gap: space.xs,
  fontSize: 12,
  color: c.text.tertiary,
});

export const note = style({
  width: '100%',
  resize: 'vertical',
  padding: `${space.sm}px ${space.md}px`,
  borderRadius: radius.sm,
  border: `1px solid ${c.glass.border}`,
  background: c.glass.fill,
  color: c.text.primary,
  font: 'inherit',
  fontSize: 16,
  selectors: { '&:focus': { outline: `2px solid ${c.accent}`, outlineOffset: 1 } },
});

export const buttons = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });
