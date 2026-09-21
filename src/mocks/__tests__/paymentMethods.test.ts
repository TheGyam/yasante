import { matchRoute, MockError } from '@/shared/lib/api/mock';
import { db } from '../db';
import '../stylist';

const call = (method: string, url: string, accountId: string | undefined, body?: unknown) => {
  const match = matchRoute(method, url);
  if (!match) throw new Error(`no handler for ${method} ${url}`);
  return match.route.handler({ params: match.params, query: match.query, body, accountId }) as any;
};

afterEach(() => {
  db.stylists.get('acc_ama')!.paymentMethods = undefined;
});

describe('payment methods', () => {
  it('keep only complete ones, and never reach her public page', () => {
    const saved = call('patch', '/api/stylists/me/', 'acc_ama', {
      paymentMethods: [
        { label: 'Monzo', details: ' monzo.me/ama ' },
        { label: 'Bank transfer', details: '' },
      ],
    }).paymentMethods;
    expect(saved).toEqual([{ id: expect.any(String), label: 'Monzo', details: 'monzo.me/ama' }]);

    const page = call('get', '/api/stylists/by-handle/braidsbyama/', 'acc_client');
    expect(page.profile.paymentMethods).toBeUndefined();
  });

  it('refuse more than five', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ label: `Way ${i}`, details: 'x' }));
    expect(() => call('patch', '/api/stylists/me/', 'acc_ama', { paymentMethods: six })).toThrow(
      MockError
    );
  });
});
