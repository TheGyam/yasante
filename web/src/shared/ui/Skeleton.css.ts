import { keyframes, style } from '@vanilla-extract/css';
import { EASE_IN_OUT, media, radius } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const pulse = keyframes({ from: { opacity: 1 }, to: { opacity: 0.45 } });

/** Only opacity moves. */
export const skeleton = style({
  background: vars.color.glass.fillStrong,
  borderRadius: radius.sm,
  animation: `${pulse} 1.4s ${EASE_IN_OUT} infinite alternate`,
  '@media': { [media.reducedMotion]: { animation: 'none' } },
});
