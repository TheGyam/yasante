import { style } from '@vanilla-extract/css';
import { EASE_OUT, media, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';
import { pressable } from '@/shared/ui/motion.css';

export const card = style({
  position: 'relative',
  display: 'block',
  borderRadius: radius.md,
  overflow: 'hidden',
  // Off-screen cards skip layout and paint: the web's answer to a virtualised list.
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 300px',
  ...pressable(0.98),
});

export const photo = style({ width: '100%' });

/** Over a photo, whatever the theme: a dark fade with white text. */
export const shade = style({
  position: 'absolute',
  inset: 'auto 0 0',
  padding: `${space.xxxl}px ${space.md}px ${space.md}px`,
  background: 'linear-gradient(to top, rgba(12, 6, 9, 0.62), transparent)',
  color: '#fff',
  display: 'grid',
  gap: 2,
  opacity: 0,
  transform: 'translateY(4px)',
  transition: `opacity ${vars.time.state} ${EASE_OUT}, transform ${vars.time.state} ${EASE_OUT}`,
  selectors: {
    [`${card}:hover &, ${card}:focus-visible &`]: { opacity: 1, transform: 'none' },
  },
  '@media': { [media.noHover]: { opacity: 1, transform: 'none' } },
});

export const title = style({
  fontSize: '0.875rem',
  fontWeight: weight.semibold,
  lineHeight: 1.3,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
});

export const meta = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.xs,
  fontSize: '0.75rem',
  fontWeight: weight.medium,
  opacity: 0.85,
});

export const featuredBadge = style({
  position: 'absolute',
  top: space.xs,
  left: space.xs,
  padding: '2px 8px',
  borderRadius: radius.pill,
  background: 'rgba(12, 6, 9, 0.65)',
  color: '#fff',
  fontSize: '0.75rem',
  fontWeight: weight.medium,
  backdropFilter: 'blur(8px)',
  zIndex: 1,
});
