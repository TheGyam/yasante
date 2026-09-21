import { matchRoute, MockError } from '@/shared/lib/api/mock';
import { shelfSummary } from '@/features/shelf/format';
import { db } from '../db';
import '../shelf';

const call = (method: string, url: string, body?: unknown) => {
  const match = matchRoute(method, url);
  if (!match) throw new Error(`no handler for ${method} ${url}`);
  return match.route.handler({
    params: match.params,
    query: match.query,
    body,
    accountId: 'acc_new',
  }) as any;
};

beforeEach(() => db.shelves.delete('acc_new'));

describe('the shelf', () => {
  it('finds products by any words, in any order', () => {
    const found = call('get', '/api/products/?q=castor%20jamaican');
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((p: any) => /castor/i.test(p.name + p.brand))).toBe(true);
  });

  it('counts a repurchase, and only after it was finished', () => {
    const item = call('post', '/api/shelf/', { productId: 'prd_3' });
    expect(() => call('post', '/api/shelf/', { productId: 'prd_3' })).toThrow(MockError);
    expect(() => call('patch', `/api/shelf/${item.id}/`, { status: 'repurchased' })).toThrow(
      MockError
    );

    const finished = call('patch', `/api/shelf/${item.id}/`, { status: 'finished' });
    expect(finished.finishedAt).toBeDefined();

    const again = call('patch', `/api/shelf/${item.id}/`, { status: 'repurchased' });
    expect(again).toMatchObject({ status: 'repurchased', timesBought: 2, finishedAt: undefined });
    expect(shelfSummary([again])).toBe('1 in use · 1 finished · 1 bought again');
  });

  it('keeps ratings between one and five', () => {
    const item = call('post', '/api/shelf/', { productId: 'prd_4' });
    expect(() => call('patch', `/api/shelf/${item.id}/`, { rating: 0 })).toThrow(MockError);
    expect(call('patch', `/api/shelf/${item.id}/`, { rating: 5 }).rating).toBe(5);
  });
});
