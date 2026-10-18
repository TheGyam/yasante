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
