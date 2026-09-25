/**
 * Static design tokens — the app's (src/shared/theme/tokens.ts at the repo root),
 * identical in light and dark, so layout styles never need the theme.
 */

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

/** The widest a page gets, and the column for long text. */
export const CONTENT_WIDTH = 1080;
export const READING_WIDTH = 680;

export const FONT = "'Instrument Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Weights of Instrument Sans, as the app's font families. */
export const weight = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;

interface TypeStyle {
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform?: 'uppercase';
}

/**
 * The app's type scale, in the app's points. On the web the sizes become rem (16 = 1rem)
 * so they follow the reader's text size; see shared/ui/Text.css.ts.
 */
export const type = {
  display: { fontWeight: weight.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.9 },
  title1: { fontWeight: weight.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  title2: { fontWeight: weight.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  title3: { fontWeight: weight.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontWeight: weight.regular, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  bodyStrong: { fontWeight: weight.semibold, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  callout: { fontWeight: weight.medium, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  subhead: { fontWeight: weight.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  footnote: { fontWeight: weight.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontWeight: weight.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  overline: {
    fontWeight: weight.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof type;

/** The app's motion curves and durations (src/shared/theme/motion.ts). */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
export const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

export const duration = {
  pressIn: 120,
  pressOut: 180,
  state: 180,
  move: 250,
  enter: 250,
} as const;

/** Breakpoints, as media queries. */
export const media = {
  tablet: 'screen and (min-width: 640px)',
  wide: 'screen and (min-width: 760px)',
  desktop: 'screen and (min-width: 900px)',
  large: 'screen and (min-width: 960px)',
  phone: 'screen and (max-width: 480px)',
  noHover: '(hover: none)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  dark: '(prefers-color-scheme: dark)',
} as const;
