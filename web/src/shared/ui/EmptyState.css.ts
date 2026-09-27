import { style } from '@vanilla-extract/css';
import { space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const empty = style({
  display: 'grid',
  justifyItems: 'center',
  gap: space.sm,
  padding: `${space.giant}px ${space.xl}px`,
  textAlign: 'center',
});

export const icon = style({
  display: 'grid',
  placeItems: 'center',
  width: 56,
  height: 56,
  marginBottom: space.sm,
  borderRadius: '50%',
  background: vars.color.accentSoft,
  color: vars.color.accent,
});

export const body = style({ maxWidth: '34ch' });
export const action = style({ marginTop: space.md });
