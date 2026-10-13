import { style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space, weight } from '@/shared/theme/tokens';
import { darkSurface, vars } from '@/shared/theme/vars.css';
import { HEADER_HEIGHT } from '@/shared/ui/SiteHeader.css';

/** Petal to amber: the dark theme's own pastels, the light theme's deeper pair on white. */
const SILK = `linear-gradient(100deg, ${vars.color.accent} 10%, ${vars.color.gold} 100%)`;
const PLUM = [
  'radial-gradient(70% 80% at 85% 0%, rgba(242,179,92,0.14), transparent 70%)',
  'radial-gradient(110% 100% at 20% 100%, #5A2C78 0%, #341848 55%, #140A1A 100%)',
].join(', ');

export const block = style({
  display: 'grid',
  gap: space.xl,
  marginTop: space.huge,
  '@media': { [media.wide]: { marginTop: 88 } },
});

export const head = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: space.lg,
});

export const overline = style({
  margin: `0 0 ${space.md}px`,
  color: vars.color.accent,
  fontSize: 12,
  fontWeight: weight.bold,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
});

/** Big type, tracked tight, as in the hero. */
export const big = style({
  margin: 0,
  fontSize: 'clamp(40px, 5.4vw, 76px)',
  fontWeight: weight.bold,
  lineHeight: 0.92,
  letterSpacing: '-0.045em',
  textTransform: 'uppercase',
});

export const silk = style({
  background: SILK,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
});

const pillBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  height: 48,
  padding: '0 22px',
  borderRadius: radius.pill,
  fontSize: 13,
  fontWeight: weight.bold,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  transition: `transform 180ms ${EASE_OUT}, background-color 180ms ${EASE_OUT}`,
  selectors: {
    '&:active': { transform: 'scale(0.97)' },
    '&:hover': { transform: 'translateY(-1px)' },
  },
} as const;

export const pill = style({
  ...pillBase,
  background: vars.color.text.primary,
  color: vars.color.bg,
});

export const light = style({
  ...pillBase,
  justifySelf: 'start',
  background: '#F6F0F5',
  color: '#160B1C',
});

export const sides = style({
  display: 'grid',
  gap: space.lg,
  '@media': { [media.large]: { gridTemplateColumns: '1fr 1fr' } },
});

export const panel = style([
  darkSurface,
  {
    display: 'grid',
    alignContent: 'start',
    gap: space.xl,
    padding: space.xxl,
    borderRadius: 28,
    color: '#F6F0F5',
    background: PLUM,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
    '@media': { [media.wide]: { padding: 36 } },
  },
]);

export const panelKicker = style({
  margin: 0,
  color: '#F2B35C',
  fontSize: 12,
  fontWeight: weight.bold,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
});

export const points = style({
  display: 'grid',
  gap: space.xl,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const point = style({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: space.lg,
  alignItems: 'start',
});

export const icon = style({
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: 'rgba(199,156,227,0.16)',
  color: '#C79CE3',
});

export const pointText = style({ display: 'grid', gap: 4 });
export const pointTitle = style({
  fontSize: 17,
  fontWeight: weight.bold,
  letterSpacing: '-0.015em',
});
export const pointBody = style({ color: 'rgba(246,240,245,0.7)', fontSize: 14, lineHeight: 1.5 });

export const join = style([
  darkSurface,
  {
    display: 'grid',
    gap: space.xxl,
    marginTop: space.huge,
    padding: space.xxl,
    borderRadius: 32,
    color: '#F6F0F5',
    background: PLUM,
    scrollMarginTop: HEADER_HEIGHT + space.xxl,
    '@media': {
      [media.wide]: { marginTop: 88, padding: 48 },
      [media.large]: { gridTemplateColumns: '1fr 1.1fr', gap: 56, alignItems: 'center' },
    },
  },
]);

export const joinText = style({ display: 'grid', gap: space.sm });
export const joinBody = style({
  maxWidth: '40ch',
  margin: `${space.md}px 0 0`,
  color: 'rgba(246,240,245,0.72)',
});

export const form = style({
  padding: space.xl,
  borderRadius: 24,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderTopColor: 'rgba(255,255,255,0.2)',
});
