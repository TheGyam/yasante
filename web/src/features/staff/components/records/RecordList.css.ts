import { keyframes, style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const sweep = keyframes({
  from: { transform: 'translateX(-100%)' },
  to: { transform: 'translateX(100%)' },
});

export const results = style({
  position: 'relative',
  transition: `opacity ${vars.time.state}`,
  selectors: {
    // The old rows stay while new ones load: dimmed, with a thin line moving across.
    '&[data-loading="true"]': { opacity: 0.6 },
    '&[data-loading="true"]::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      zIndex: 2,
      borderRadius: radius.pill,
      background: `linear-gradient(90deg, transparent, ${vars.color.accent}, transparent)`,
      animation: `${sweep} 900ms linear infinite`,
    },
  },
});

export const pager = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: space.xs,
});

export const titleSkeleton = style({ height: 56, width: 320, borderRadius: radius.md });
export const tableSkeleton = style({ height: 480, borderRadius: radius.lg });
