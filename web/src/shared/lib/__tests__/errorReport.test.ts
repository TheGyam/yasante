import { reportError, startErrorReports } from '../errorReport';

afterEach(() => vi.unstubAllGlobals());

function capture() {
  const bodies: Record<string, unknown>[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 204 });
    })
  );
  return bodies;
}

it('sends nothing in development', () => {
  const bodies = capture();
  startErrorReports({ endpoint: '/api/client-errors/', platform: 'web' });
  reportError(new Error('boom'));
  expect(bodies).toHaveLength(0);
});

it('sends at most five reports a page, with the path but never the query', () => {
  const bodies = capture();
  window.history.pushState({}, '', '/looks/123?token=secret');
  startErrorReports({ endpoint: '/api/client-errors/', platform: 'web', force: true });
  for (let n = 0; n < 8; n++) reportError(new Error(`boom ${n}`));
  expect(bodies).toHaveLength(5);
  expect(bodies[0]).toMatchObject({ kind: 'crash', platform: 'web', message: 'boom 0' });
  expect(JSON.stringify(bodies)).not.toContain('secret');
  expect((bodies[0].context as { path: string }).path).toBe('/looks/123');
});
