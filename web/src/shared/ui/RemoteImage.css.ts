import { style } from '@vanilla-extract/css';
import { EASE_OUT } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const frame = style({
  position: 'relative',
  overflow: 'hidden',
  background: vars.color.accentSoft,
});

export const image = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  opacity: 0,
  transition: `opacity ${vars.time.enter} ${EASE_OUT}`,
});

export const loaded = style({ opacity: 1 });
