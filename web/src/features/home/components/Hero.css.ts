import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { EASE_OUT, media, weight } from '@/shared/theme/tokens';
import { darkSurface } from '@/shared/theme/vars.css';

/** Wide screens get the full stage; below this it stacks into one column. */
const stageWide = media.large;
const SILK = 'linear-gradient(100deg, #F8D7DE 0%, #FF8FB8 48%, #F4B860 100%)';
const INK = '#F8F1F4';
const MUTED = 'rgba(248,241,244,0.7)';

export const stage = style([
  darkSurface,
  {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    flexDirection: 'column',
    margin: 10,
    padding: '92px 20px 24px',
    borderRadius: 28,
    overflow: 'hidden',
    color: INK,
    // The plum, lit: a berry glow behind her, falling off to aubergine at the edges.
    background: [
      'radial-gradient(70% 60% at 52% 42%, rgba(255,143,184,0.20), transparent 70%)',
      'radial-gradient(45% 40% at 88% 12%, rgba(244,184,96,0.16), transparent 70%)',
      'radial-gradient(120% 95% at 50% 45%, #7C1A45 0%, #4C0C2A 48%, #22060F 100%)',
    ].join(', '),
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    '@media': {
      [stageWide]: {
        display: 'block',
        height: 'calc(100svh - 20px)',
        minHeight: 660,
        maxHeight: 1000,
        padding: 0,
        borderRadius: 32,
      },
    },
  },
]);

// ---------------------------------------------------------------- the figure
export const figure = style({
  position: 'relative',
  order: 3,
  width: '100%',
  maxWidth: 520,
  aspectRatio: '1',
  margin: '0 auto -12px',
  // a sideways drag turns her; up and down still scrolls the page
  touchAction: 'pan-y',
  // on a phone her sweater fades into the copy below instead of ending in a straight line
  maskImage: 'linear-gradient(to bottom, #000 78%, transparent)',
  WebkitMaskImage: 'linear-gradient(to bottom, #000 78%, transparent)',
  '@media': {
    [stageWide]: {
      position: 'absolute',
      zIndex: 0,
      left: '50%',
      bottom: 0,
      width: 'auto',
      maxWidth: 'none',
      height: '95%',
      margin: 0,
      transform: 'translateX(-50%)',
      maskImage: 'none',
      WebkitMaskImage: 'none',
    },
  },
});

export const canvas = style({
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  width: '100%',
  height: '100%',
});

export const poster = style({ position: 'absolute', inset: 0, width: '100%', height: '100%' });
globalStyle(`${canvas}[data-ready="true"] ~ ${poster}`, { visibility: 'hidden' });

// ---------------------------------------------------------------- the copy, left
export const copy = style({
  // On a phone the copy's parts join the stage's column, so she can stand between them.
  display: 'contents',
  '@media': {
    [stageWide]: {
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2,
      position: 'absolute',
      top: '19%',
      bottom: 34,
      left: 'clamp(28px, 5.6vw, 96px)',
      width: 'min(34%, 470px)',
    },
  },
});

export const kicker = style({
  order: 1,
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '0 0 18px',
  fontSize: 12,
  fontWeight: weight.bold,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

export const tick = style({
  display: 'grid',
  placeItems: 'center',
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: '#F4B860',
  color: '#2A0716',
});

export const title = style({
  order: 2,
  position: 'relative',
  zIndex: 2,
  margin: 0,
  fontSize: 'clamp(54px, 6.6vw, 112px)',
  fontWeight: weight.bold,
  lineHeight: 0.9,
  letterSpacing: '-0.045em',
  textTransform: 'uppercase',
});

export const silk = style({
  background: SILK,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  // the gradient's own glow, faint, as on the film's stressed words
  filter: 'drop-shadow(0 0 22px rgba(255,143,184,0.28))',
});

export const lede = style({
  order: 4,
  maxWidth: '38ch',
  margin: '22px 0 0',
  color: MUTED,
  fontSize: 15,
  lineHeight: 1.6,
});

/** Words for a mouse, or for a finger. */
export const hoverOnly = style({ '@media': { '(hover: none)': { display: 'none' } } });
export const touchOnly = style({ '@media': { '(hover: hover)': { display: 'none' } } });

export const foot = style({
  order: 5,
  display: 'grid',
  gap: 18,
  marginTop: 26,
  '@media': { [stageWide]: { marginTop: 'auto' } },
});

export const actions = style({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 });

const press = {
  transition: `transform 180ms ${EASE_OUT}, background-color 180ms ${EASE_OUT}, border-color 180ms ${EASE_OUT}`,
  selectors: { '&:active': { transform: 'scale(0.97)' } },
} as const;

export const primary = style({
  ...press,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 12,
  height: 56,
  padding: '0 26px',
  borderRadius: 999,
  background: '#140A0F',
  border: '1px solid rgba(255,255,255,0.08)',
  color: INK,
  fontSize: 15,
  fontWeight: weight.bold,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  selectors: {
    '&:hover': { background: '#22121A', transform: 'translateY(-1px)' },
    '&:active': { transform: 'scale(0.97)' },
  },
});

export const watch = style({
  ...press,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  height: 56,
  padding: '0 18px 0 6px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.04)',
  cursor: 'pointer',
  selectors: { '&:hover': { borderColor: 'rgba(255,255,255,0.36)' } },
});

export const play = style({
  display: 'grid',
  placeItems: 'center',
  width: 44,
  height: 44,
  borderRadius: '50%',
  background: '#F4B860',
  color: '#2A0716',
  boxShadow: '0 6px 18px rgba(244,184,96,0.35)',
});

export const watchLabel = style({
  fontSize: 11,
  fontWeight: weight.bold,
  lineHeight: 1.15,
  letterSpacing: '0.08em',
  textAlign: 'left',
  textTransform: 'uppercase',
});

export const readout = style({
  display: 'none',
  alignItems: 'center',
  gap: 10,
  margin: 0,
  color: MUTED,
  fontSize: 11,
  fontWeight: weight.bold,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  '@media': { [stageWide]: { display: 'flex' } },
});

export const dot = style({ width: 7, height: 7, borderRadius: '50%', background: '#F4B860' });

export const track = style({
  position: 'relative',
  width: 132,
  height: 1,
  margin: '0 4px',
  background: 'rgba(248,241,244,0.3)',
});

export const knob = style({
  position: 'absolute',
  top: -4,
  left: 'calc(50% + var(--gaze, 0) * 50% - 4px)',
  width: 9,
  height: 9,
  borderRadius: '50%',
  background: INK,
  boxShadow: '0 0 0 4px rgba(248,241,244,0.12)',
});

export const value = style({ minWidth: '9ch', color: INK, fontVariantNumeric: 'tabular-nums' });

// ---------------------------------------------------------------- the eye, the badge
const desktopOnly = {
  display: 'none',
  '@media': { [`${stageWide} and (hover: hover)`]: { display: 'grid' } },
} as const;

export const eye = style({
  ...desktopOnly,
  position: 'absolute',
  zIndex: 2,
  top: '13%',
  left: 'clamp(160px, 19vw, 300px)',
  placeItems: 'center',
  width: 46,
  height: 46,
  borderRadius: '50%',
  border: '1.5px solid rgba(248,241,244,0.75)',
});

export const pupil = style({
  width: 13,
  height: 13,
  borderRadius: '50%',
  background: INK,
  transform: 'translateX(calc(var(--gaze, 0) * 11px))',
});

const spin = keyframes({ to: { transform: 'rotate(360deg)' } });

export const badge = style({
  ...desktopOnly,
  position: 'absolute',
  zIndex: 2,
  left: '37%',
  bottom: 30,
  placeItems: 'center',
  width: 116,
  height: 116,
});

export const ring = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  overflow: 'visible',
  animation: `${spin} 22s linear infinite`,
  '@media': { [media.reducedMotion]: { animation: 'none' } },
});

export const ringText = style({
  fill: 'rgba(248,241,244,0.82)',
  fontSize: 9.5,
  fontWeight: weight.bold,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
});

export const arrow = style({
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '1px solid rgba(248,241,244,0.4)',
  transform: 'rotate(calc(45deg + var(--gaze, 0) * -70deg))',
});

// ---------------------------------------------------------------- right: the crowd, the cards
export const crowd = style({
  display: 'none',
  '@media': {
    [stageWide]: {
      display: 'block',
      position: 'absolute',
      zIndex: 2,
      top: '29%',
      right: 'clamp(28px, 4.4vw, 80px)',
      width: 230,
    },
  },
});

export const avatars = style({
  display: 'flex',
  margin: '0 0 14px',
  padding: 0,
  listStyle: 'none',
});

globalStyle(`${avatars} > li`, {
  width: 44,
  height: 44,
  marginLeft: -10,
  borderRadius: '50%',
  overflow: 'hidden',
  border: '2px solid #4C0C2A',
});
globalStyle(`${avatars} > li:first-child`, { marginLeft: 0 });
globalStyle(`${avatars} img`, { width: '100%', height: '100%', objectFit: 'cover' });

export const you = style({
  display: 'grid',
  placeItems: 'center',
  background: '#F4B860',
  color: '#2A0716',
  fontSize: 11,
  fontWeight: weight.bold,
});

export const crowdTitle = style({
  margin: 0,
  fontSize: 17,
  fontWeight: weight.bold,
  letterSpacing: '-0.02em',
});
export const crowdBody = style({ margin: '4px 0 0', color: MUTED, fontSize: 12 });

export const cards = style({
  position: 'relative',
  zIndex: 2,
  order: 6,
  display: 'flex',
  gap: 12,
  margin: '28px -20px 0',
  padding: '4px 20px 8px',
  overflowX: 'auto',
  scrollSnapType: 'x mandatory',
  scrollbarWidth: 'none',
  listStyle: 'none',
  '@media': {
    [stageWide]: {
      position: 'absolute',
      right: -46,
      bottom: 30,
      margin: 0,
      padding: 0,
      overflow: 'visible',
    },
  },
});

export const card = style({
  position: 'relative',
  flex: '0 0 auto',
  width: 'clamp(176px, 14vw, 214px)',
  height: 'clamp(214px, 17vw, 250px)',
  padding: 16,
  borderRadius: 22,
  overflow: 'hidden',
  scrollSnapAlign: 'start',
  background: 'linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04) 60%)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderTopColor: 'rgba(255,255,255,0.28)',
  boxShadow: '0 18px 40px rgba(20,4,12,0.35)',
  backdropFilter: 'blur(14px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
  transition: `transform 250ms ${EASE_OUT}`,
  selectors: { '&:hover': { transform: 'translateY(-4px)' } },
});

export const prop = style({
  position: 'absolute',
  right: '-28%',
  bottom: '-12%',
  width: '92%',
  height: 'auto',
  pointerEvents: 'none',
  transition: `transform 350ms ${EASE_OUT}`,
  selectors: { [`${card}:hover &`]: { transform: 'scale(1.06) rotate(-4deg)' } },
});

export const cardTitle = style({
  position: 'relative',
  maxWidth: '62%',
  margin: 0,
  fontSize: 17,
  fontWeight: weight.bold,
  lineHeight: 1.08,
  letterSpacing: '-0.02em',
});

export const cardBody = style({
  position: 'relative',
  maxWidth: '52%',
  margin: '8px 0 0',
  color: MUTED,
  fontSize: 11.5,
  lineHeight: 1.35,
});

export const go = style({
  position: 'absolute',
  left: 16,
  bottom: 16,
  display: 'inline-grid',
  placeItems: 'center',
  minWidth: 46,
  height: 30,
  padding: '0 12px',
  borderRadius: 999,
  background: INK,
  color: '#22060F',
  fontSize: 11,
  fontWeight: weight.bold,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  transition: `transform 180ms ${EASE_OUT}`,
  selectors: {
    // the whole card answers the tap
    '&::after': { content: '', position: 'absolute', inset: -400 },
    '&:active': { transform: 'scale(0.96)' },
  },
});
