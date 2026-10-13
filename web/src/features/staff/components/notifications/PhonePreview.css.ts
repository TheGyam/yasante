import { style } from '@vanilla-extract/css';
import { space, weight } from '@/shared/theme/tokens';

// A phone's lock screen looks the same whatever theme the workspace is in.
export const phone = style({
  margin: 0,
  padding: `${space.xl}px ${space.md}px ${space.xxxl}px`,
  borderRadius: 36,
  background: 'linear-gradient(160deg, #33243f, #110b13 70%)',
  border: '6px solid #1b1420',
  color: '#fff',
});

export const time = style({
  textAlign: 'center',
  fontSize: 44,
  fontWeight: weight.semibold,
  letterSpacing: '-0.02em',
  marginBottom: space.lg,
});

export const notice = style({
  padding: `${space.sm}px ${space.md}px ${space.md}px`,
  borderRadius: 18,
  background: 'rgba(255,255,255,0.18)',
  backdropFilter: 'blur(20px)',
});

export const head = style({
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  marginBottom: 4,
});
export const icon = style({ width: 18, height: 18, borderRadius: 5 });
export const app = style({ flex: 1, fontSize: 11, letterSpacing: '0.04em', opacity: 0.75 });
export const now = style({ fontSize: 11, opacity: 0.6 });
export const title = style({
  fontSize: 14,
  fontWeight: weight.semibold,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// A locked screen shows about four lines before "…".
export const body = style({
  fontSize: 14,
  lineHeight: 1.35,
  display: '-webkit-box',
  WebkitLineClamp: 4,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
});
