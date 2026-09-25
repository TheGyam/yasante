import { style } from '@vanilla-extract/css';
import { CONTENT_WIDTH, EASE_OUT, GUTTER, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const bar = style({
  maxWidth: CONTENT_WIDTH,
  margin: '0 auto',
  padding: `${space.sm}px ${GUTTER}px 0`,
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
});

/** The studio's tabs: they scroll sideways on a phone rather than wrap. */
export const tabs = style({
  flex: 1,
  display: 'flex',
  gap: space.xs,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '::-webkit-scrollbar': { display: 'none' },
});

export const tab = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 40,
  padding: `0 ${space.md}px`,
  borderRadius: radius.pill,
  color: vars.color.text.secondary,
  fontSize: '0.9375rem',
  fontWeight: weight.medium,
  whiteSpace: 'nowrap',
  transition: `color ${vars.time.state} ${EASE_OUT}, background-color ${vars.time.state} ${EASE_OUT}`,
  ':hover': { color: vars.color.text.primary },
  selectors: {
    '&[aria-current="page"]': {
      color: vars.color.text.primary,
      background: vars.color.glass.fillStrong,
    },
  },
});

export const badge = style({
  minWidth: 20,
  height: 20,
  padding: '0 6px',
  borderRadius: radius.pill,
  background: vars.color.accent,
  color: vars.color.text.onAccent,
  fontSize: '0.75rem',
  fontWeight: weight.semibold,
  display: 'grid',
  placeItems: 'center',
});
