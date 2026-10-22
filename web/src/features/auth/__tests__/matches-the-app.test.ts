import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { PASSWORD_HINT, POLICY_VERSION, PASSWORD_RULES } from '../rules';
import { handleProblem, toHandle } from '../../stylist/handle';

// Tests run from web/; the app is its parent. Compiled, so the app's packages aren't needed.
async function appModule(path: string) {
  const source = readFileSync(resolve(process.cwd(), '..', path), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  return import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(js.outputText)}`);
}

/** An account made on the web works in the app: the same rules, the same terms. */
describe('the web’s sign-up rules are the app’s', () => {
  it('agrees to the same policy version', async () => {
    const app = await appModule('src/shared/config/policies.ts');
    expect(POLICY_VERSION).toBe(app.POLICY_VERSION);
  });

  it('asks for the same password', async () => {
    const app = await appModule('src/shared/utils/validation.ts');
    expect(PASSWORD_RULES.map(r => [r.label, r.error])).toEqual(
      app.PASSWORD_RULES.map((r: { label: string; error: string }) => [r.label, r.error])
    );
    expect(PASSWORD_HINT).toBe(app.PASSWORD_HINT);
    // Length is what counts: a long lowercase password is fine, a short complicated one isn't.
    expect(PASSWORD_RULES.every(r => r.test('teapot river mango'))).toBe(true);
    expect(PASSWORD_RULES.every(r => r.test('Br#2'))).toBe(false);
    for (const password of ['short', 'alllowercase1!', 'NoSymbol123', 'Braids#2026']) {
      expect(PASSWORD_RULES.every(r => r.test(password))).toBe(
        app.PASSWORD_RULES.every((r: { test: (p: string) => boolean }) => r.test(password))
      );
    }
  });

  it('makes and checks handles the same way', async () => {
    const app = await appModule('src/features/stylist/handle.ts');
    for (const input of [
      'Braids by Ama!',
      '__ama',
      'a',
      'ama..b',
      'ama_',
      'x'.repeat(30),
      'ok.name',
    ]) {
      expect(toHandle(input)).toBe(app.toHandle(input));
      expect(handleProblem(input)).toBe(app.handleProblem(input));
    }
  });
});
