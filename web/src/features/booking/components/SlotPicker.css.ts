import { style, styleVariants } from '@vanilla-extract/css';
import { EASE_IN_OUT, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { pressable, stateTransition } from '@/shared/ui/motion.css';

export const body = style({ display: 'grid', gap: space.lg });
export const dim = style({ opacity: 0.6 });

// Ideas first: her soonest, a weekend, or ready for a date that matters.
export const ideas = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: space.sm,
  '@media': { '(min-width: 480px)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' } },
});
// On a phone, the date needs the whole width to show in full.
export const readyIdea = style({
  gridColumn: '1 / -1',
  '@media': { '(min-width: 480px)': { gridColumn: 'auto' } },
});
export const idea = style({
  minWidth: 0,
  display: 'grid',
  alignContent: 'start',
  justifyItems: 'start',
  gap: 2,
  minHeight: 92,
  padding: space.md,
  borderRadius: radius.lg,
  border: `1px solid ${vars.color.glass.border}`,
  borderTopColor: vars.color.glass.highlight,
  background: vars.color.glass.fill,
  color: vars.color.text.primary,
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  ...pressable(0.98, stateTransition('background-color', 'border-color')),
  selectors: {
    '&[aria-pressed="true"], &[data-on="true"]': {
      borderColor: vars.color.accent,
      background: vars.color.accentSoft,
    },
    '&:disabled': { cursor: 'default', opacity: 0.6 },
  },
});
export const ideaIcon = style({ color: vars.color.accent });
export const ideaGold = style({ color: vars.color.gold });
export const dateInput = style({
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
  marginTop: space.xs,
  padding: `${space.xs}px ${space.sm}px`,
  borderRadius: radius.sm,
  border: `1px solid ${vars.color.glass.border}`,
  background: vars.color.glass.fillStrong,
  color: vars.color.text.primary,
  font: 'inherit',
  fontSize: 14,
  colorScheme: 'inherit',
});
export const hint = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  flexWrap: 'wrap',
});

export const card = style({ display: 'grid', gap: space.md, padding: space.md });
export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});
export const nav = style({ display: 'flex', gap: space.xs });
export const navButton = style({
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: 0,
  background: 'transparent',
  color: vars.color.text.primary,
  cursor: 'pointer',
  ...pressable(0.92),
  selectors: { '&:disabled': { opacity: 0.3, cursor: 'default' } },
});
export const filters = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });

// One month, or two side by side once there's room for both.
export const months = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: space.xl,
  '@media': { '(min-width: 600px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } },
});
export const second = style({
  display: 'none',
  '@media': { '(min-width: 600px)': { display: 'grid' } },
});
export const month = style({ display: 'grid', gap: 2, alignContent: 'start' });
export const week = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: 2,
});
export const weekday = style({
  textAlign: 'center',
  fontSize: 12,
  color: vars.color.text.tertiary,
});

export const day = style({
  height: 46,
  display: 'grid',
  justifyItems: 'center',
  alignContent: 'center',
  gap: 4,
  padding: 0,
  borderRadius: radius.md,
  border: '1px solid transparent',
  background: 'transparent',
  color: vars.color.text.tertiary,
  font: 'inherit',
  fontSize: 15,
  fontWeight: weight.medium,
  fontVariantNumeric: 'tabular-nums',
  cursor: 'default',
  ...pressable(0.94, stateTransition('background-color', 'border-color', 'color')),
});
export const dayState = styleVariants({
  open: {
    background: vars.color.glass.fill,
    borderColor: vars.color.glass.border,
    color: vars.color.text.primary,
    cursor: 'pointer',
  },
  full: { cursor: 'pointer', textDecoration: 'line-through' },
  on: {
    background: vars.color.accent,
    borderColor: vars.color.accent,
    color: vars.color.text.onAccent,
    fontWeight: weight.semibold,
    cursor: 'pointer',
  },
  event: {
    border: `1.5px solid ${vars.color.gold}`,
    color: vars.color.gold,
    fontWeight: weight.semibold,
  },
  before: { border: `1.5px dashed ${vars.color.accent}` },
});
export const bar = style({ height: 4, borderRadius: 2, width: 0 });
export const barRoom = styleVariants({
  plenty: { width: 18, background: vars.color.accent },
  few: { width: 6, background: vars.color.gold },
  on: { background: vars.color.text.onAccent },
});

export const banner = style({
  display: 'grid',
  gap: space.sm,
  justifyItems: 'start',
  padding: space.md,
  borderRadius: radius.lg,
  background: vars.color.accentSoft,
});

// The day drawn out: her hours, what's booked, and the appointment where it'd sit.
export const timeline = style({ display: 'grid', gridTemplateColumns: '44px 1fr', gap: space.sm });
export const hours = style({ position: 'relative' });
export const hourLabel = style({
  position: 'absolute',
  right: 0,
  fontSize: 12,
  lineHeight: '16px',
  color: vars.color.text.tertiary,
  fontVariantNumeric: 'tabular-nums',
});
export const track = style({
  position: 'relative',
  borderRadius: radius.md,
  background: vars.color.glass.fill,
  border: `1px solid ${vars.color.glass.border}`,
  overflow: 'hidden',
  cursor: 'pointer',
});
export const line = style({
  position: 'absolute',
  left: 0,
  right: 0,
  height: 1,
  background: vars.color.separator,
});
export const block = style({
  position: 'absolute',
  left: space.sm,
  right: space.sm,
  boxSizing: 'border-box',
  padding: `${space.xs}px ${space.sm}px`,
  borderRadius: radius.sm,
  background: `repeating-linear-gradient(135deg, ${vars.color.glass.fillStrong} 0 6px, ${vars.color.glass.fill} 6px 12px)`,
  color: vars.color.text.secondary,
  fontSize: 12,
  lineHeight: '16px',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
});
export const mine = style({
  background: vars.color.warningSoft,
  border: `1px solid ${vars.color.gold}`,
});
export const you = style({
  position: 'absolute',
  top: 0,
  left: space.sm,
  right: space.sm,
  boxSizing: 'border-box',
  // One line, so even an hour's job shows when it ends.
  display: 'flex',
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  columnGap: space.sm,
  overflow: 'hidden',
  padding: `${space.sm}px ${space.md}px`,
  borderRadius: radius.md,
  background: vars.color.accent,
  color: vars.color.text.onAccent,
  pointerEvents: 'none',
  transition: `transform ${vars.time.move} ${EASE_IN_OUT}`,
});
export const youName = style({ fontWeight: weight.semibold });

export const part = style({ display: 'grid', gap: space.sm });
export const times = style({ display: 'flex', flexWrap: 'wrap', gap: space.sm });
export const skeletons = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: space.sm,
});
