import { style } from '@vanilla-extract/css';
import { radius, weight } from '@/shared/theme/tokens';

export const pill = style({
  position: 'absolute',
  top: 6,
  right: 6,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  height: 22,
  padding: '0 7px',
  borderRadius: radius.pill,
  background: 'rgba(12, 8, 10, 0.6)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: weight.semibold,
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none',
});
