import { matchRoute } from '@/shared/lib/api/mock';
import { db } from '../db';
import '../looks';
import '../stylist';

const call = (method: string, url: string, accountId: string, body?: unknown) => {
  const match = matchRoute(method, url);
  if (!match) throw new Error(`no handler for ${method} ${url}`);
  return match.route.handler({ params: match.params, query: match.query, body, accountId }) as any;
};

describe('adding work with "Also post to Looks"', () => {
  it('shares tagged photos as looks with their price, and keeps the rest private', () => {
    const before = db.looks.length;
    const added = call('post', '/api/stylists/me/portfolio/', 'acc_ama', {
      postAsLooks: true,
      photos: [{ uri: 'a.jpg', serviceId: 'men_knotless' }, { uri: 'b.jpg' }],
    });
    expect(added[0].lookId).toBeTruthy();
    expect(added[1].lookId).toBeUndefined();
    expect(db.looks.length).toBe(before + 1);
    expect(call('get', `/api/looks/${added[0].lookId}/`, 'acc_client')).toMatchObject({
      styles: ['knotless'],
      price: 120,
      stylist: { id: 'acc_ama' },
    });
  });

  it('shares nothing when she turns it off', () => {
    const before = db.looks.length;
    const added = call('post', '/api/stylists/me/portfolio/', 'acc_ama', {
      postAsLooks: false,
      photos: [{ uri: 'c.jpg', serviceId: 'men_knotless' }],
    });
    expect(added[0].lookId).toBeUndefined();
    expect(db.looks.length).toBe(before);
  });
});
