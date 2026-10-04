import { style } from '@vanilla-extract/css';
import { radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const account = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  minWidth: 0,
  selectors: { '&[data-rail="true"]': { flexDirection: 'column' } },
});

export const avatar = style({
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 32,
  height: 32,
  borderRadius: radius.pill,
  overflow: 'hidden',
  background: c.accentSoft,
  color: c.accent,
  fontSize: 12,
  fontWeight: weight.bold,
});

export const photo = style({ width: '100%', height: '100%', objectFit: 'cover' });

export const who = style({ display: 'grid', flex: 1, minWidth: 0, lineHeight: 1.25 });

export const name = style({
  fontSize: 13,
  fontWeight: weight.semibold,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const role = style({ fontSize: 12, color: c.text.tertiary });
