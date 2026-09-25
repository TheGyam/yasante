import { style } from '@vanilla-extract/css';
import { CONTENT_WIDTH, GUTTER, READING_WIDTH, media, space } from '@/shared/theme/tokens';

export const page = style({
  width: '100%',
  maxWidth: CONTENT_WIDTH,
  margin: '0 auto',
  padding: `${space.lg}px ${GUTTER}px ${space.giant}px`,
  '@media': { [media.wide]: { paddingTop: space.xxxl } },
});

export const reading = style({ maxWidth: READING_WIDTH + 2 * GUTTER });
