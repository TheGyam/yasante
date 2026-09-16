/**
 * Static design tokens — identical in light and dark, so layout styles never need
 * the theme. Colours live in ./themes.ts.
 */
import type { TextStyle } from 'react-native';

/** 4pt grid. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Minimum touch target (44pt iOS / 48dp Android). */
export const HIT_TARGET = 44;

/** Page gutter. */
export const GUTTER = space.xl;

/**
 * Custom fonts on Android ignore fontWeight — each weight is its own family — so
 * every text style names its family explicitly and never sets fontWeight.
 */
export const fonts = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
} as const;

type TypeStyle = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform' | 'fontVariant'
>;

/** Type scale. Tight tracking on large sizes, open tracking on small caps. */
export const type = {
  display: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.9 },
  title1: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  title2: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  title3: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  callout: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  subhead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  numeric: {
    fontFamily: fonts.semibold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof type;
