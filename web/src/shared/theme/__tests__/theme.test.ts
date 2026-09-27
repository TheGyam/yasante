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
