import { style } from '@vanilla-extract/css';
import { EASE_OUT, radius, space, weight } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

export const field = style({ display: 'grid', gap: 6 });

export const label = style({
  fontSize: '0.8125rem',
  fontWeight: weight.medium,
  color: vars.color.text.secondary,
});

export const control = style({
  width: '100%',
  minHeight: 48,
  padding: `0 ${space.lg}px`,
  borderRadius: radius.md,
  border: `1px solid ${vars.color.glass.border}`,
  background: vars.color.glass.fillStrong,
  color: vars.color.text.primary,
  fontSize: '1rem',
  transition: `border-color ${vars.time.state} ${EASE_OUT}`,
  appearance: 'none',
  '::placeholder': { color: vars.color.text.tertiary },
  ':focus': { outline: 'none', borderColor: vars.color.accent },
});

/** A chevron drawn in the text colour, so it follows the theme. */
export const select = style([
  control,
  {
    paddingRight: 40,
    backgroundImage: [
      'linear-gradient(45deg, transparent 50%, currentColor 50%)',
      'linear-gradient(135deg, currentColor 50%, transparent 50%)',
    ].join(', '),
    backgroundPosition: 'calc(100% - 22px) 55%, calc(100% - 17px) 55%',
    backgroundSize: '5px 5px',
    backgroundRepeat: 'no-repeat',
  },
]);

export const hint = style({ fontSize: '0.8125rem', color: vars.color.text.tertiary });
