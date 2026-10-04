import { globalStyle, style } from '@vanilla-extract/css';
import { radius, space } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

const c = vars.color;

export const card = style({
  display: 'grid',
  gap: space.md,
  padding: space.xl,
  borderRadius: radius.lg,
  background: c.glass.fill,
  border: `1px solid ${c.glass.border}`,
  containerType: 'inline-size',
});

/**
 * One column by default; two once the card is wide enough, for short fields only. Long
 * text, switches and multi-pickers always take the full width, so rows line up.
 */
export const fields = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: `${space.lg}px ${space.xl}px`,
  '@container': { '(min-width: 560px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } },
});

globalStyle(`${fields} > :has(textarea, [role="switch"], fieldset, [data-wide="true"])`, {
  gridColumn: '1 / -1',
});
globalStyle(`${fields} > [data-wide="true"]`, { gridColumn: '1 / -1' });
