import { globalStyle, style } from '@vanilla-extract/css';
import { CONTENT_WIDTH, GUTTER, HIT_TARGET, space } from '@/shared/theme/tokens';
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

export const socialLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: HIT_TARGET,
  minHeight: HIT_TARGET,
  color: vars.color.text.secondary,
  ':hover': { color: vars.color.text.primary },
});

export const socials = style({
  display: 'flex',
  gap: space.xs,
  marginTop: space.xs,
});

globalStyle(`${links} a`, { color: vars.color.text.secondary, fontSize: '0.875rem' });
globalStyle(`${links} a:hover`, { color: vars.color.text.primary });
