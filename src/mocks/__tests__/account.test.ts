import { matchRoute, MockError } from '@/shared/lib/api/mock';
import { db } from '../db';
import '../users';

const call = (method: string, url: string, accountId: string | undefined, body?: unknown) => {
  const match = matchRoute(method, url);
  if (!match) throw new Error(`no handler for ${method} ${url}`);
  return match.route.handler({ params: match.params, query: match.query, body, accountId }) as any;
};

describe('the account', () => {
  it('keeps every hair profile change instead of overwriting it', () => {
    call('patch', '/api/users/acc_client/hair-profile/', 'acc_client', { length: 'chin' });
    call('patch', '/api/users/acc_client/hair-profile/', 'acc_client', { length: 'shoulder' });
    const lengths = db.hairSnapshots
      .filter(s => s.accountId === 'acc_client')
      .map(s => (s.profile as { length?: string }).length);
    expect(lengths.slice(-2)).toEqual(['chin', 'shoulder']);
  });

  it('drops events from an account that withdrew the analytics consent', () => {
    const before = db.events.length;
    call('post', '/api/consents/', 'acc_zainab', {
      consents: [{ purpose: 'analytics', granted: false, policyVersion: 'v1', recordedAt: 'x' }],
    });
    call('post', '/api/events/', 'acc_zainab', {
      events: [{ name: 'view_look', at: 'a', localAt: 'b' }],
    });
    expect(db.events.length).toBe(before);
  });

  it('exports and deletes only your own account', () => {
    expect(() => call('post', '/api/users/acc_ama/export/', 'acc_client')).toThrow(MockError);
    expect(call('post', '/api/users/acc_client/export/', 'acc_client').requestedAt).toBeDefined();
    expect(() => call('delete', '/api/users/acc_ama/', 'acc_client')).toThrow(MockError);
  });

  it('removes what was hers on deletion', () => {
    db.shelves.set('acc_new', []);
    db.hairSnapshots.push({ accountId: 'acc_new', profile: {}, at: 'x' });
    call('delete', '/api/users/acc_new/', 'acc_new');
    expect(db.accounts.has('acc_new')).toBe(false);
    expect(db.shelves.has('acc_new')).toBe(false);
    expect(db.hairSnapshots.some(s => s.accountId === 'acc_new')).toBe(false);
  });
});
