import { style } from '@vanilla-extract/css';
import { vars } from '@/shared/theme/vars.css';
export const key = style({
  border: `1px solid ${vars.color.separator}`,
  borderRadius: 5,
  padding: '2px 5px',
  font: 'inherit',
  fontSize: 11,
  color: vars.color.text.tertiary,
  '@media': { '(hover: none)': { display: 'none' } },
});
