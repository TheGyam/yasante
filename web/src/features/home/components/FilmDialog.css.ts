import { keyframes, style } from '@vanilla-extract/css';
import { EASE_OUT, media } from '@/shared/theme/tokens';

const enter = keyframes({
  from: { opacity: 0, transform: 'scale(0.96)' },
  to: { opacity: 1, transform: 'scale(1)' },
});

export const dialog = style({
  width: 'min(92vw, 86svh, 860px)',
  padding: 0,
  border: 0,
  borderRadius: 24,
  overflow: 'visible',
  background: '#0B0709',
  boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
  selectors: {
    '&[open]': { animation: `${enter} 300ms ${EASE_OUT}` },
    '&::backdrop': { background: 'rgba(5,3,4,0.78)', backdropFilter: 'blur(6px)' },
  },
  '@media': { [media.reducedMotion]: { selectors: { '&[open]': { animation: 'none' } } } },
});

export const video = style({
  display: 'block',
  width: '100%',
  height: 'auto',
  aspectRatio: '1',
  borderRadius: 24,
  background: '#0B0709',
});

export const close = style({
  position: 'absolute',
  top: -14,
  right: -14,
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.2)',
  background: '#1C0F16',
  color: '#F8F1F4',
  cursor: 'pointer',
});
