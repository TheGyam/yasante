import { globalStyle, style } from '@vanilla-extract/css';
import { weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const avatar = style({
  flex: 'none',
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  overflow: 'hidden',
  background: vars.color.accentSoft,
  color: vars.color.accent,
  fontWeight: weight.semibold,
});

globalStyle(`${avatar} img`, { width: '100%', height: '100%', objectFit: 'cover' });
