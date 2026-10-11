import '../users';
import '../stylist';
import { matchRoute } from '@/shared/lib/api/mock';
import { identifierPolicy, isReservedName, nameProblem, normaliseName } from '../identifiers';

describe('the mock follows the server’s name policy', () => {
  it.each([
    'ADMIN',
    '@Admin',
    'a.d.m.i.n',
    'admin123',
    'adm1n',
    'adrnin',
    'support_team',
    'r00t',
    'yasante_support',
    'y4s4nte',
    'no.reply',
    'payment_methods',
  ])('reserves %s', name => expect(isReservedName(name)).toBe(true));

  it.each([
    'yasmin',
    'rootedbeauty',
    'supportivecurls',
    'admina',
    'ama.braids',
    'officiallybraids',
  ])('allows %s', name => expect(nameProblem(name, 24)).toBeUndefined());

  it.each([
    'аdmin',
    'ａｄｍｉｎ',
    'ad\u200bmin',
    'Kate',
    'two..dots',
    'end_',
    '@@ama',
    'a'.repeat(31),
  ])('rejects malformed or confusable %s', name =>
    expect(nameProblem(normaliseName(name), 30)).toBeDefined()
  );

  it('reserves every configured name', () => {
    for (const name of [...identifierPolicy.routes, ...identifierPolicy.reserved])
      expect(isReservedName(name)).toBe(true);
  });

  it('rejects a reserved name in mock profile writes and availability', () => {
    const patch = matchRoute('patch', '/api/users/acc_client/')!;
    expect(() =>
      patch.route.handler({
        params: patch.params,
        query: patch.query,
        accountId: 'acc_client',
        body: { username: 'admin123' },
      })
    ).toThrow('not available');
    const check = matchRoute('get', '/api/users/username-check/?username=yasante_support')!;
    expect(
      check.route.handler({
        params: check.params,
        query: check.query,
        accountId: 'acc_client',
        body: undefined,
      })
    ).toMatchObject({ available: false });
    const handle = matchRoute('patch', '/api/stylists/me/')!;
    expect(() =>
      handle.route.handler({
        params: handle.params,
        query: handle.query,
        accountId: 'acc_ama',
        body: { handle: 'support.team' },
      })
    ).toThrow('not available');
  });
});
