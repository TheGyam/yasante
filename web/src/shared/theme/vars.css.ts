import {
  assignVars,
  createGlobalThemeContract,
  createGlobalTheme,
  globalStyle,
} from '@vanilla-extract/css';
import { darkTheme, lightTheme, type Theme } from './themes';
import { duration, media } from './tokens';

/**
 * The theme as CSS variables: styles read `vars.color.accent` and get the light or dark
 * value from the reader's setting, with no script involved. Named plainly (--accent,
 * --glass-fill) so they're easy to find in the browser's inspector.
 */
const kebab = (path: string[]) =>
  path.map(part => part.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)).join('-');

const colorShape = (theme: Theme) => ({ ...theme.colors, glow: theme.glow });

export const color = createGlobalThemeContract(colorShape(lightTheme), (_, path) => kebab(path));

createGlobalTheme(':root', color, colorShape(lightTheme));
globalStyle(':root', {
  colorScheme: 'light',
  '@media': {
    [media.dark]: { colorScheme: 'dark', vars: assignVars(color, colorShape(darkTheme)) },
  },
});

/** Durations as variables, so asking for reduced motion stops everything at once. */
export const time = createGlobalThemeContract(
  { pressIn: '', pressOut: '', state: '', move: '', enter: '' },
  (_, path) => `t-${kebab(path)}`
);

const ms = (values: Record<keyof typeof duration, number>) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, `${v}ms`])) as Record<
    keyof typeof duration,
    string
  >;

createGlobalTheme(':root', time, ms(duration));
globalStyle(':root', {
  '@media': {
    [media.reducedMotion]: {
      vars: assignVars(time, ms({ pressIn: 0, pressOut: 0, state: 0, move: 0, enter: 0 })),
    },
  },
});

export const vars = { color, time };
