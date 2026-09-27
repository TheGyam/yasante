import { style } from '@vanilla-extract/css';
import { EASE_OUT, radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const column = style({ maxWidth: 560, margin: '0 auto', display: 'grid', gap: space.xl });

export const progress = style({
  height: 4,
  borderRadius: radius.pill,
  background: vars.color.glass.fillStrong,
  overflow: 'hidden',
});

/** Grows with a transform, never a width: the bar is scaled, not laid out again. */
export const progressFill = style({
  height: '100%',
  background: vars.color.accent,
  transformOrigin: 'left',
  transition: `transform ${vars.time.move} ${EASE_OUT}`,
});

export const heading = style({ display: 'grid', gap: space.sm });
export const step = style({ display: 'grid', gap: space.xl });
export const actions = style({ display: 'grid', gap: space.sm });
export const done = style({ display: 'grid', gap: space.lg, justifyItems: 'start' });
