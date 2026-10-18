import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;
const wide = 'screen and (min-width: 1100px)';

// ── The list ─────────────────────────────────────────

export const intro = style({ color: c.text.secondary, fontSize: 14, maxWidth: 560 });

export const toolbar = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
});

export const stages = style({ display: 'flex', flexWrap: 'wrap', gap: space.xs });

export const stage = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  minHeight: 32,
  padding: `0 ${space.md}px`,
  borderRadius: radius.pill,
  border: `1px solid ${c.glass.border}`,
  background: 'transparent',
  color: c.text.secondary,
  font: 'inherit',
  fontSize: 13,
  fontWeight: weight.medium,
  cursor: 'pointer',
  selectors: {
    '&:hover': { color: c.text.primary, borderColor: c.glass.highlight },
    '&[aria-pressed="true"]': {
      background: c.accentSoft,
      borderColor: c.accent,
      color: c.text.primary,
    },
  },
});

export const search = style({ width: 'min(280px, 100%)' });

export const cards = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
  gap: space.lg,
});

export const card = style({
  display: 'grid',
  gap: space.md,
  height: '100%',
  padding: space.lg,
  borderRadius: radius.lg,
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
  borderTopColor: c.glass.highlight,
  color: c.text.primary,
  textDecoration: 'none',
  transition: `border-color ${vars.time.state}`,
  selectors: {
    '&:hover': { borderColor: c.accent },
    '&:focus-visible': { outline: `2px solid ${c.accent}`, outlineOffset: 2 },
  },
});

/** Their three newest looks across the top of the card. */
export const strip = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 3,
  margin: `-${space.lg - 6}px -${space.lg - 6}px 0`,
  borderRadius: radius.md,
  overflow: 'hidden',
});
export const stripImage = style({
  width: '100%',
  aspectRatio: '1',
  objectFit: 'cover',
  display: 'block',
  background: c.glass.fillStrong,
});

export const who = style({ display: 'flex', alignItems: 'center', gap: space.md, minWidth: 0 });

export const avatar = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 48,
  height: 48,
  borderRadius: radius.pill,
  overflow: 'hidden',
  background: c.accentSoft,
  color: c.accent,
  fontSize: 18,
  fontWeight: weight.semibold,
});
export const avatarLarge = style({ width: 72, height: 72, fontSize: 26 });
export const avatarImage = style({ width: '100%', height: '100%', objectFit: 'cover' });

export const name = style({ fontSize: 16, fontWeight: weight.semibold, lineHeight: 1.25 });
export const sub = style({ color: c.text.secondary, fontSize: 13 });

/** Four steps in a row: looks, their yes, live, theirs. */
export const progress = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 4,
});
export const segment = style({
  height: 4,
  borderRadius: radius.pill,
  background: c.glass.fillStrong,
  selectors: { '&[data-done="true"]': { background: c.accent } },
});

export const next = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.sm,
  fontSize: 13,
});
export const nextText = style({ color: c.text.secondary });

export const waiting = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: radius.pill,
  background: c.accentSoft,
  color: c.text.primary,
  fontSize: 12,
  fontWeight: weight.semibold,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});

export const pager = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space.md,
  color: c.text.secondary,
  fontSize: 13,
});

// ── One stylist ──────────────────────────────────────

export const back = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: space.xs,
  color: c.text.tertiary,
  fontSize: 13,
  textDecoration: 'none',
  selectors: { '&:hover': { color: c.text.primary } },
});

export const layout = style({
  display: 'grid',
  gap: space.xxl,
  alignItems: 'start',
  '@media': { [wide]: { gridTemplateColumns: 'minmax(0, 1fr) 300px' } },
});

export const main = style({ display: 'grid', gap: space.xl, minWidth: 0 });

export const side = style({
  display: 'grid',
  gap: space.md,
  '@media': { [wide]: { position: 'sticky', top: space.xl } },
});

export const profile = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.lg,
  minWidth: 0,
});
export const title = style({ fontSize: 26, fontWeight: weight.bold, lineHeight: 1.15 });
export const handleLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  color: c.text.secondary,
  textDecoration: 'none',
  selectors: { '&:hover': { color: c.accent } },
});

/** The one thing to do now, always at the top. */
export const nextCard = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.lg,
  padding: space.xl,
  borderRadius: radius.lg,
  background: `linear-gradient(135deg, ${c.accentSoft}, transparent)`,
  border: `1px solid ${c.accent}`,
});
export const nextDone = style({
  background: `linear-gradient(135deg, ${c.successSoft}, transparent)`,
  borderColor: c.success,
});
export const nextLabel = style({
  color: c.text.tertiary,
  fontSize: 11,
  fontWeight: weight.semibold,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
});
export const nextTitle = style({ fontSize: 18, fontWeight: weight.semibold });

export const section = style({
  display: 'grid',
  gap: space.lg,
  padding: space.xl,
  borderRadius: radius.lg,
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
  borderTopColor: c.glass.highlight,
  minWidth: 0,
});
export const sectionHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
});
export const sectionTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  fontSize: 16,
  fontWeight: weight.semibold,
});
export const tick = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 22,
  height: 22,
  borderRadius: radius.pill,
  background: c.successSoft,
  color: c.success,
  fontSize: 11,
  fontWeight: weight.semibold,
});
export const stepNumber = style({ background: c.glass.fillStrong, color: c.text.secondary });

export const looks = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: space.md,
});
export const look = style({ display: 'grid', gap: space.xs, alignContent: 'start', minWidth: 0 });
export const cover = style({ position: 'relative', borderRadius: radius.md, overflow: 'hidden' });
export const coverImage = style({
  width: '100%',
  aspectRatio: '4 / 5',
  objectFit: 'cover',
  display: 'block',
});
export const photoCount = style({
  position: 'absolute',
  top: 6,
  left: 6,
  padding: '2px 7px',
  borderRadius: radius.pill,
  background: 'rgba(12,6,9,0.7)',
  color: '#fff',
  fontSize: 11,
  fontWeight: weight.semibold,
});
export const iconButton = style({
  display: 'grid',
  placeItems: 'center',
  width: 28,
  height: 28,
  padding: 0,
  border: 0,
  borderRadius: radius.pill,
  background: 'rgba(12,6,9,0.7)',
  color: '#fff',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: 'rgba(12,6,9,0.9)' },
    '&:focus-visible': { outline: `2px solid ${c.accent}`, outlineOffset: 2 },
    '&:disabled': { opacity: 0.5, cursor: 'default' },
  },
});
export const coverAction = style({ position: 'absolute', top: 6, right: 6 });
export const tags = style({ display: 'flex', flexWrap: 'wrap', gap: 4 });
export const tag = style({
  padding: '2px 8px',
  borderRadius: radius.pill,
  background: c.glass.fillStrong,
  color: c.text.secondary,
  fontSize: 12,
});

/** "Add a look", as the first tile of the grid. */
export const addTile = style({
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: space.sm,
  aspectRatio: '4 / 5',
  borderRadius: radius.md,
  border: `1.5px dashed ${c.glass.highlight}`,
  background: 'transparent',
  color: c.text.secondary,
  font: 'inherit',
  fontSize: 13,
  fontWeight: weight.medium,
  cursor: 'pointer',
  selectors: {
    '&:hover': { borderColor: c.accent, color: c.text.primary },
    '&:focus-visible': { outline: `2px solid ${c.accent}`, outlineOffset: 2 },
  },
});

export const done = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: space.md,
  padding: space.md,
  borderRadius: radius.md,
  background: c.successSoft,
  fontSize: 14,
});

export const linkBox = style({
  display: 'grid',
  gap: space.sm,
  padding: space.md,
  borderRadius: radius.md,
  background: c.glass.fillStrong,
});
export const linkText = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  overflowWrap: 'anywhere',
});
export const message = style({ whiteSpace: 'pre-wrap', fontSize: 13, color: c.text.secondary });

export const fields = style({
  border: 0,
  padding: 0,
  margin: 0,
  minWidth: 0,
  display: 'grid',
  gap: space.lg,
});
export const twoUp = style({
  display: 'grid',
  gap: space.lg,
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
});

export const summary = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: weight.semibold,
  listStyle: 'none',
  selectors: { '&::-webkit-details-marker': { display: 'none' } },
});

export const dangerZone = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
  paddingTop: space.lg,
  borderTop: `1px solid ${c.separator}`,
  color: c.text.tertiary,
  fontSize: 13,
});
export const danger = style({
  color: c.danger,
  borderColor: c.danger,
  background: c.dangerSoft,
});

export const narrow = style({ display: 'grid', gap: space.xl, maxWidth: 560 });

// ── The phone preview (always dark, like a phone) ───

export const phone = style({
  margin: 0,
  padding: `${space.lg}px ${space.md}px`,
  borderRadius: 32,
  background: 'linear-gradient(170deg, #2a1820, #0d0709 60%)',
  border: '6px solid #1c1418',
  color: '#F8F1F4',
  display: 'grid',
  gap: space.md,
});
export const phoneHead = style({
  display: 'grid',
  justifyItems: 'center',
  gap: 6,
  textAlign: 'center',
});
export const phoneAvatar = style({
  display: 'grid',
  placeItems: 'center',
  width: 64,
  height: 64,
  borderRadius: radius.pill,
  overflow: 'hidden',
  background: 'rgba(255,143,184,0.16)',
  color: '#FF8FB8',
  fontSize: 24,
  fontWeight: weight.semibold,
});
export const phoneName = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 6,
  fontSize: 17,
  fontWeight: weight.bold,
});
export const phoneBadge = style({
  padding: '1px 7px',
  borderRadius: radius.pill,
  background: 'rgba(255,255,255,0.12)',
  fontSize: 10,
  fontWeight: weight.semibold,
});
export const phoneMuted = style({ color: 'rgba(248,241,244,0.6)', fontSize: 11 });
export const phoneButton = style({
  display: 'grid',
  placeItems: 'center',
  height: 34,
  borderRadius: radius.pill,
  background: '#FF8FB8',
  color: '#1C0912',
  fontSize: 12,
  fontWeight: weight.semibold,
});
export const phoneButtonQuiet = style({ background: 'rgba(255,255,255,0.12)', color: '#F8F1F4' });
export const phoneGrid = style({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 });
export const phoneTile = style({
  aspectRatio: '4 / 5',
  borderRadius: 6,
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.06)',
});
export const phoneImage = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});
export const caption = style({ textAlign: 'center', color: c.text.tertiary, fontSize: 12 });

// ── Adding a look ────────────────────────────────────

export const composer = style({
  display: 'grid',
  gap: space.lg,
  padding: space.xl,
  borderRadius: radius.lg,
  border: `1px solid ${c.accent}`,
  background: c.glass.fill,
});
export const composerHead = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
});
export const drop = style({
  display: 'grid',
  placeItems: 'center',
  gap: space.sm,
  padding: `${space.xxl}px ${space.lg}px`,
  borderRadius: radius.md,
  border: `1.5px dashed ${c.glass.highlight}`,
  textAlign: 'center',
  color: c.text.secondary,
  fontSize: 14,
  transition: `border-color ${vars.time.state}, background ${vars.time.state}`,
  selectors: {
    '&[data-over="true"]': { borderColor: c.accent, background: c.accentSoft },
  },
});
export const dropSmall = style({ padding: space.md, gridAutoFlow: 'column', gap: space.md });
export const dropIcon = style({ color: c.accent });
export const hiddenInput = style({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});
export const chooseLink = style({
  color: c.accent,
  fontWeight: weight.semibold,
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
});
export const thumbs = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
  gap: space.sm,
});
export const thumb = style({
  position: 'relative',
  borderRadius: radius.sm,
  overflow: 'hidden',
  cursor: 'grab',
  outline: '2px solid transparent',
  outlineOffset: -2,
  selectors: { '&[data-cover="true"]': { outlineColor: c.accent } },
});
export const thumbImage = style({
  width: '100%',
  aspectRatio: '4 / 5',
  objectFit: 'cover',
  display: 'block',
});
export const thumbBadge = style({ background: c.accent, color: c.text.onAccent });
export const thumbActions = style({
  position: 'absolute',
  right: 4,
  bottom: 4,
  display: 'flex',
  gap: 4,
});
export const label = style({ fontSize: 13, fontWeight: weight.semibold });
export const hint = style({ color: c.text.tertiary, fontSize: 12, fontWeight: weight.regular });
export const group = style({ border: 0, padding: 0, margin: 0, display: 'grid', gap: space.sm });
export const chips = style({ display: 'flex', flexWrap: 'wrap', gap: space.xs });
export const chip = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  minHeight: 32,
  padding: `0 ${space.md}px`,
  borderRadius: radius.pill,
  border: `1px solid ${c.glass.border}`,
  background: 'transparent',
  color: c.text.primary,
  fontSize: 13,
  cursor: 'pointer',
  userSelect: 'none',
  selectors: {
    '&:hover': { borderColor: c.glass.highlight },
    '&:has(input:checked)': { background: c.accent, borderColor: c.accent, color: c.text.onAccent },
    '&[data-on="true"]': { background: c.accent, borderColor: c.accent, color: c.text.onAccent },
    '&:has(input:disabled:not(:checked))': { opacity: 0.4, cursor: 'default' },
    '&:has(input:focus-visible)': { outline: `2px solid ${c.accent}`, outlineOffset: 2 },
  },
});
export const chipInput = style({ position: 'absolute', opacity: 0, pointerEvents: 'none' });
export const composerFooter = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: space.sm,
});
