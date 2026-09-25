import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

/**
 * The app's own palette and tokens, which the site must match exactly. Compiled here
 * rather than imported, so this runs without the app's dependencies installed.
 */
async function appModule(name: string) {
  const source = read(`../../../../../src/shared/theme/${name}.ts`);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  return import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(js.outputText)}`);
}

const { darkTheme, lightTheme } = await appModule('themes');
const { radius, space } = await appModule('tokens');
const css = read('../theme.css');

function kebab(key: string) {
  return key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
}

/** { '--glass-fill': 'rgba(…)' } for a theme's colours, named the way theme.css names them. */
function expected(colors: object, prefix = ''): Record<string, string> {
  return Object.entries(colors).reduce<Record<string, string>>((all, [key, value]) => {
    const name = prefix ? `${prefix}-${kebab(key)}` : kebab(key);
    return typeof value === 'string'
      ? { ...all, [`--${name}`]: value }
      : { ...all, ...expected(value, name) };
  }, {});
}

function declared(block: string) {
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
  );
}

// Same colour, however it's written: case, spaces and 0.10 vs 0.1 don't matter.
const normalise = (v: string) =>
  v
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/\d*\.?\d+/g, n => String(Number(n)));
const [light] = css.split('@media (prefers-color-scheme: dark)');
const dark = /@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

describe('the site’s theme', () => {
  it.each([
    ['light', light, lightTheme.colors],
    ['dark', dark, darkTheme.colors],
  ])('uses the app’s %s colours', (_, block, colors) => {
    const have = declared(block);
    for (const [name, value] of Object.entries(expected(colors))) {
      expect([name, normalise(have[name] ?? 'missing')]).toEqual([name, normalise(value)]);
    }
  });

  it('uses the app’s spacing and radii', () => {
    const have = declared(css);
    for (const [key, value] of Object.entries(space))
      expect(have[`--space-${key}`]).toBe(`${value}px`);
    for (const [key, value] of Object.entries(radius))
      expect(have[`--radius-${key}`]).toBe(`${value}px`);
  });
});
