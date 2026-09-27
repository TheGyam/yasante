import { globalStyle, style } from '@vanilla-extract/css';
import { CONTENT_WIDTH, GUTTER, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const footer = style({
  maxWidth: CONTENT_WIDTH,
  margin: '0 auto',
  padding: `${space.xxxl}px ${GUTTER}px ${space.huge}px`,
  borderTop: `1px solid ${vars.color.separator}`,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.lg,
});

export const links = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${space.xs}px ${space.xl}px`,
});

globalStyle(`${links} a`, { color: vars.color.text.secondary, fontSize: '0.875rem' });
globalStyle(`${links} a:hover`, { color: vars.color.text.primary });
