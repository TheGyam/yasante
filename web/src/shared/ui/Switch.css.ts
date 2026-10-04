import { style } from '@vanilla-extract/css';
import { vars } from '@/shared/theme/vars.css';
import { space } from '@/shared/theme/tokens';
export const row = style({
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.lg,
});
export const hint = style({ display: 'block', color: vars.color.text.secondary });
export const control = style({
  appearance: 'none',
  flexShrink: 0,
  width: 40,
  height: 24,
  borderRadius: 20,
  border: `1px solid ${vars.color.separator}`,
  background: vars.color.glass.fillStrong,
  position: 'relative',
  cursor: 'pointer',
  ':checked': { background: vars.color.accent },
  ':focus-visible': { outline: `2px solid ${vars.color.accent}`, outlineOffset: 3 },
  '::after': {
    content: '""',
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: vars.color.text.primary,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  selectors: { '&:checked::after': { transform: 'translateX(16px)' } },
});
