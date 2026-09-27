import { style, styleVariants } from '@vanilla-extract/css';
import { FONT, media, type as scale, type TypeVariant } from '@/shared/theme/tokens';
import { vars } from '@/shared/theme/vars.css';

/** The app's points as the web's units: rem for size, ratios for leading, em for tracking. */
function toWeb({
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
  ...rest
}: (typeof scale)[TypeVariant]) {
  return {
    fontSize: `${fontSize / 16}rem`,
    lineHeight: (lineHeight / fontSize).toFixed(3),
    letterSpacing: `${(letterSpacing / fontSize).toFixed(3)}em`,
    fontWeight,
    ...rest,
  };
}

export const text = style({ margin: 0, fontFamily: FONT, color: vars.color.text.primary });

export const variant = styleVariants(scale, (value, name) => ({
  ...toWeb(value),
  // Wide screens get the larger headline the room allows.
  '@media':
    name === 'display'
      ? { [media.wide]: { fontSize: '3.25rem', lineHeight: 1.08, letterSpacing: '-0.032em' } }
      : name === 'title1'
        ? { [media.wide]: { fontSize: '2rem', lineHeight: 1.19 } }
        : undefined,
}));

export const tone = styleVariants(
  {
    primary: vars.color.text.primary,
    secondary: vars.color.text.secondary,
    tertiary: vars.color.text.tertiary,
    accent: vars.color.accent,
    danger: vars.color.danger,
    success: vars.color.success,
  },
  color => ({ color })
);

export const clamp = style({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const tabular = style({ fontVariantNumeric: 'tabular-nums' });
