import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { darkTheme, lightTheme } from '../themes';
import { duration, radius, space, type } from '../tokens';

/**
 * The app's own theme files, compiled here rather than imported so this runs without
 * the app's dependencies (React Native, Expo) installed.
 */
// Tests run from web/; the app is its parent.
const APP_THEME = resolve(process.cwd(), '../src/shared/theme');
const appSource = (name: string) => readFileSync(join(APP_THEME, `${name}.ts`), 'utf8');

async function appModule(name: string) {
  const source = appSource(name);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  return import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(js.outputText)}`);
}

const app = {
  ...(await appModule('themes')),
  ...(await appModule('tokens')),
};

describe('the site’s theme is the app’s', () => {
  it('has the same colours, light and dark', () => {
    expect(lightTheme.colors).toEqual(app.lightTheme.colors);
    expect(darkTheme.colors).toEqual(app.darkTheme.colors);
  });

  it('has the same spacing, radii and type scale', () => {
    expect(space).toEqual(app.space);
    expect(radius).toEqual(app.radius);
    for (const [variant, style] of Object.entries(type)) {
      const theirs = app.type[variant];
      expect([variant, style.fontSize, style.lineHeight, style.letterSpacing]).toEqual([
        variant,
        theirs.fontSize,
        theirs.lineHeight,
        theirs.letterSpacing,
      ]);
      // The app names each weight's font family: InstrumentSans_600SemiBold.
      expect(theirs.fontFamily).toContain(`_${style.fontWeight}`);
    }
  });

  it('has the same motion timings', () => {
    const motion = appSource('motion');
    for (const [name, ms] of Object.entries(duration)) {
      expect(motion).toMatch(new RegExp(`${name}: \\{ duration: ${ms},`));
    }
  });
});

/** WCAG contrast of `colour` (hex or rgba) laid over the solid `ground`. */
function contrast(colour: string, ground: string) {
  const parse = (c: string) =>
    c.startsWith('#')
      ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).concat(1)
      : c
          .replace(/[^\d.,]/g, '')
          .split(',')
          .map(Number);
  const [r, g, b] = parse(ground);
  const [cr, cg, cb, a] = parse(colour);
  const mixed = [cr * a + r * (1 - a), cg * a + g * (1 - a), cb * a + b * (1 - a)];
  const luminance = (rgb: number[]) => {
    const [lr, lg, lb] = rgb.map(v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  };
  const [hi, lo] = [luminance(mixed), luminance([r, g, b])].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('text is readable', () => {
  it.each([lightTheme, darkTheme])('meets 4.5:1 on the page and on cards, $scheme', theme => {
    const { bg, glass, text, accent, gold, success, warning, danger } = theme.colors;
    const [r, g, b, a] = glass.fill
      .replace(/[^\d.,]/g, '')
      .split(',')
      .map(Number);
    const bgRgb = [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16));
    const card = `rgb(${[r, g, b].map((v, i) => Math.round(v * a + bgRgb[i] * (1 - a))).join(',')})`;
    const asHex = (c: string) =>
      '#' +
      c
        .replace(/[^\d,]/g, '')
        .split(',')
        .map(v => Number(v).toString(16).padStart(2, '0'))
        .join('');
    for (const ground of [bg, asHex(card)]) {
      for (const colour of [
        text.primary,
        text.secondary,
        text.tertiary,
        accent,
        gold,
        success,
        warning,
        danger,
      ]) {
        expect(contrast(colour, ground)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(text.onAccent, accent)).toBeGreaterThanOrEqual(4.5);
  });
});
