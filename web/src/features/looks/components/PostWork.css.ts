import { globalStyle, style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const column = style({ maxWidth: 820, display: 'grid', gap: space.lg });

export const drop = style({
  display: 'grid',
  justifyItems: 'center',
  gap: space.sm,
  padding: `${space.huge}px ${space.xl}px`,
  borderRadius: radius.xl,
  border: `2px dashed ${vars.color.glass.border}`,
  background: vars.color.glass.fill,
  textAlign: 'center',
  cursor: 'pointer',
  transition: `border-color ${vars.time.state} ${EASE_OUT}, background-color ${vars.time.state} ${EASE_OUT}`,
  ':hover': { borderColor: vars.color.accent },
});

export const dropping = style({
  borderColor: vars.color.accent,
  background: vars.color.accentSoft,
});

export const hidden = style({
  position: 'absolute',
  opacity: 0,
  width: 1,
  height: 1,
  pointerEvents: 'none',
});

export const photos = style({ display: 'grid', gap: space.md });

export const photo = style({
  display: 'grid',
  gridTemplateColumns: '96px 1fr',
  gap: space.lg,
  alignItems: 'start',
  '@media': { [media.tablet]: { gridTemplateColumns: '140px 1fr' } },
});

export const preview = style({
  width: '100%',
  aspectRatio: '4 / 5',
  objectFit: 'cover',
  borderRadius: radius.md,
});

export const fields = style({ display: 'grid', gap: space.md });
export const row = style({
  display: 'grid',
  gap: space.md,
  alignItems: 'start',
  '@media': { [media.tablet]: { gridTemplateColumns: '1fr 1fr' } },
});
export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.md,
  alignItems: 'center',
});

export const bar = style({
  height: 6,
  borderRadius: radius.pill,
  background: vars.color.glass.fillStrong,
  overflow: 'hidden',
});
export const barFill = style({
  height: '100%',
  background: vars.color.accent,
  transformOrigin: 'left',
  transition: `transform ${vars.time.move} ${EASE_OUT}`,
});

globalStyle(`${drop} svg`, { color: vars.color.accent });
