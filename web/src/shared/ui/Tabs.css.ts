import { style } from '@vanilla-extract/css';
import { vars } from '@/shared/theme/vars.css';
import { radius, space } from '@/shared/theme/tokens';
export const tabs = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.xs,
  padding: space.xs,
  borderRadius: radius.sm,
  background: vars.color.glass.fill,
});
export const tab = style({
  minHeight: 44,
  padding: `0 ${space.md}px`,
  border: 0,
  borderRadius: radius.sm,
  font: 'inherit',
  background: 'transparent',
  color: vars.color.text.secondary,
  cursor: 'pointer',
  selectors: {
    '&[aria-selected="true"]': {
      background: vars.color.accentSoft,
      color: vars.color.text.primary,
    },
  },
  ':focus-visible': { outline: `2px solid ${vars.color.accent}` },
});
