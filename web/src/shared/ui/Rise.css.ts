import { keyframes, style } from '@vanilla-extract/css';
import { EASE_OUT, duration, media } from '@/shared/theme/tokens';

const rise = keyframes({
  from: { opacity: 0, transform: 'translateY(8px)' },
  to: { opacity: 1, transform: 'none' },
});

/** Entering: a short rise and fade. Transform and opacity only; none when motion is reduced. */
export const riseIn = style({
  animation: `${rise} ${duration.enter * 1.6}ms ${EASE_OUT} both`,
  '@media': { [media.reducedMotion]: { animation: 'none' } },
});
