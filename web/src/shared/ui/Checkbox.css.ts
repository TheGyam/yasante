import { globalStyle, style } from '@vanilla-extract/css';
import { EASE_OUT, radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const row = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: space.md,
  cursor: 'pointer',
});

/** The native box, restyled: it keeps the keyboard and screen-reader behaviour for free. */
export const box = style({
  flex: 'none',
  appearance: 'none',
  width: 22,
  height: 22,
  margin: '1px 0 0',
  borderRadius: radius.sm / 2,
  border: `1.5px solid ${vars.color.text.tertiary}`,
  background: vars.color.glass.fillStrong,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  transition: `background-color ${vars.time.state} ${EASE_OUT}, border-color ${vars.time.state} ${EASE_OUT}`,
  ':checked': { background: vars.color.accent, borderColor: vars.color.accent },
  '::after': {
    content: '',
    width: 6,
    height: 11,
    marginTop: -2,
    border: `solid ${vars.color.text.onAccent}`,
    borderWidth: '0 2px 2px 0',
    transform: 'rotate(45deg) scale(0)',
    transition: `transform ${vars.time.state} ${EASE_OUT}`,
  },
});

globalStyle(`${box}:checked::after`, { transform: 'rotate(45deg) scale(1)' });

export const invalid = style({ borderColor: vars.color.danger });
