import { style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const timeline = style({
  display: 'grid',
  gap: space.lg,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  position: 'relative',
});

export const entry = style({
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: '12px minmax(0, 1fr)',
  gap: space.md,
  selectors: {
    '&:not(:last-child)::after': {
      content: '""',
      position: 'absolute',
      left: 5,
      top: 16,
      bottom: -space.lg,
      width: 2,
      background: c.separator,
    },
  },
});

export const dot = style({
  width: 12,
  height: 12,
  marginTop: 4,
  borderRadius: radius.pill,
  background: c.accentSoft,
  border: `2px solid ${c.accent}`,
});
export const loading = style({ height: 160, borderRadius: radius.md });
