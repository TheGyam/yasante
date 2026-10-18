import { style } from '@vanilla-extract/css';
import { EASE_OUT, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const container = style({
  maxWidth: 520,
  margin: '0 auto',
  display: 'grid',
  gap: space.xl,
});

export const card = style({
  display: 'grid',
  justifyItems: 'center',
  textAlign: 'center',
  gap: space.lg,
});

export const photoStrip = style({
  display: 'grid',
  // As many columns as there are photos (up to six), so a few fill the width too.
  gridAutoFlow: 'column',
  gridAutoColumns: 'minmax(0, 1fr)',
  gap: space.xs,
  width: '100%',
  borderRadius: radius.md,
  overflow: 'hidden',
  margin: `${space.sm}px 0`,
});

export const photoItem = style({
  position: 'relative',
  aspectRatio: '1 / 1',
  overflow: 'hidden',
  borderRadius: radius.sm,
});

export const actions = style({
  display: 'grid',
  gap: space.sm,
  width: '100%',
  marginTop: space.sm,
});

export const inlineInstagramLink = style({
  color: vars.color.text.primary,
  fontWeight: weight.medium,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  transition: `color ${vars.time.state} ${EASE_OUT}`,
  ':hover': {
    color: vars.color.text.secondary,
  },
});

export const expiredWrap = style({
  maxWidth: 480,
  margin: `${space.xxl}px auto`,
  textAlign: 'center',
});
