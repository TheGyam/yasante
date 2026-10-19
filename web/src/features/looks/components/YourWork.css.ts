import { style } from '@vanilla-extract/css';
import { EASE_OUT, media, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const head = style({
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: space.lg,
  marginBottom: space.lg,
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: space.sm,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  '@media': { [media.tablet]: { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' } },
});

export const tile = style({ position: 'relative', borderRadius: 12, overflow: 'hidden' });

/** "More photos" sits top left here: the remove button has the other corner. */
export const count = style({ selectors: { '&&': { right: 'auto', left: 6 } } });

/** Over a photo, whatever the theme: a dark disc with a white icon. */
export const remove = style({
  position: 'absolute',
  top: space.xs,
  right: space.xs,
  width: 32,
  height: 32,
  display: 'grid',
  placeItems: 'center',
  border: 0,
  borderRadius: '50%',
  background: 'rgba(12, 6, 9, 0.55)',
  color: '#fff',
  cursor: 'pointer',
  opacity: 0.85,
  transition: `opacity ${vars.time.state} ${EASE_OUT}`,
  ':hover': { opacity: 1 },
});

/** Top left, opposite the bin: who sees the look. */
export const lock = style([remove, { right: 'auto', left: space.xs }]);

export const editButton = style({
  position: 'absolute',
  bottom: space.xs,
  right: space.xs,
  maxWidth: `calc(100% - ${space.xs * 2}px)`,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  padding: '4px 8px',
  borderRadius: 999,
  border: 0,
  background: 'rgba(12, 6, 9, 0.65)',
  color: '#fff',
  fontSize: '0.75rem',
  cursor: 'pointer',
  opacity: 0.9,
  transition: `opacity ${vars.time.state} ${EASE_OUT}`,
  ':hover': { opacity: 1 },
});

export const editorBody = style({ display: 'grid', gap: space.md });

export const tagEditor = style({
  gridColumn: '1 / -1',
  margin: `${space.sm}px 0`,
  display: 'grid',
  gap: space.md,
});

export const chipList = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.xs,
});

export const tagsCheckBanner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: space.md,
  marginBottom: space.lg,
});

export const chip = style({
  padding: '6px 12px',
  borderRadius: 999,
  border: `1px solid ${vars.color.glass.border}`,
  background: 'transparent',
  color: vars.color.text.primary,
  cursor: 'pointer',
  fontSize: '0.8125rem',
  transition: `all ${vars.time.state} ${EASE_OUT}`,
  ':hover': { borderColor: vars.color.accent },
});

export const chipActive = style({
  borderColor: vars.color.accent,
  background: vars.color.accent,
  color: '#fff',
  fontWeight: 600,
  ':hover': { borderColor: vars.color.accent },
});

export const editorActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  marginTop: space.sm,
});
