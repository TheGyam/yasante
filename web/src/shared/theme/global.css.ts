import { globalStyle } from '@vanilla-extract/css';
import { FONT } from './tokens';
import { vars } from './vars.css';

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' });

globalStyle('html', { WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' });

globalStyle('body', {
  margin: 0,
  minHeight: '100dvh',
  background: vars.color.bg,
  color: vars.color.text.primary,
  fontFamily: FONT,
  fontSize: '1rem',
  lineHeight: 1.5,
  letterSpacing: '-0.006em',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
});

// The ambient ground: two soft glows, fixed and painted once.
globalStyle('body::before', {
  content: '',
  position: 'fixed',
  inset: 0,
  zIndex: -1,
  pointerEvents: 'none',
  background: [
    `radial-gradient(60vmax 40vmax at 12% -8%, ${vars.color.glow.rose}, transparent 70%)`,
    `radial-gradient(50vmax 36vmax at 100% 4%, ${vars.color.glow.amber}, transparent 70%)`,
  ].join(', '),
});

globalStyle('img', { display: 'block', maxWidth: '100%' });
globalStyle('a', { color: 'inherit', textDecoration: 'none' });
globalStyle('button, input, select, textarea', { font: 'inherit', color: 'inherit' });
globalStyle(':focus-visible', { outline: `2px solid ${vars.color.accent}`, outlineOffset: 2 });
globalStyle('::selection', { background: vars.color.accentSoft });

globalStyle('.visually-hidden', {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
});
