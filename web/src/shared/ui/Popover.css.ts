import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const anchor = style({ display: 'inline-flex' });

export const iconOnly = style({ paddingInline: 0, width: 36, justifyContent: 'center' });

export const panel = style({
  position: 'fixed',
  inset: 'auto',
  margin: 0,
  padding: space.xs,
  minWidth: 220,
  maxWidth: 'min(420px, calc(100vw - 24px))',
  maxHeight: '70dvh',
  overflowY: 'auto',
  border: `1px solid ${c.glass.border}`,
  borderRadius: radius.md,
  background: c.glass.chromeSolid,
  backdropFilter: 'blur(24px) saturate(1.4)',
  color: c.text.primary,
  boxShadow: `0 16px 48px ${c.scrim}`,
});
