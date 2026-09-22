import { matchRoute } from '@/shared/lib/api/mock';
import { db } from '../db';
import '../stylist';
import '../looks';
import '../bookings';
import '../planner';
import '../shelf';
import '../seed';

const call = (method: string, url: string, accountId?: string, body?: unknown) => {
  const match = matchRoute(method, url);
  if (!match) throw new Error(`no handler for ${method} ${url}`);
  return match.route.handler({ params: match.params, query: match.query, body, accountId }) as any;
};

describe('the seeded app', () => {
  it('has a feed people have engaged with, page after page', () => {
    let cursor: string | undefined;
    let seen = 0;
    do {
      const page = call(
        'get',
        `/api/looks/?limit=24${cursor ? `&cursor=${cursor}` : ''}`,
        'acc_client'
      );
      seen += page.data.length;
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toBeGreaterThan(250);
    expect(db.comments.filter(c => c.parentId).length).toBeGreaterThan(100);
  });

  it('opens every stylist page, their free times, and every look’s thread', () => {
    for (const profile of db.stylists.values()) {
      const page = call('get', `/api/stylists/by-handle/${profile.handle}/`, 'acc_client');
      expect(page.menu.length).toBeGreaterThan(0);
      call('get', `/api/stylists/by-handle/${profile.handle}/slots/?service=${page.menu[0].id}`);
    }
    for (const look of db.looks.slice(0, 80)) {
      if (look.visibility === 'private') continue;
      for (const thread of call('get', `/api/looks/${look.id}/comments/`, 'acc_client').data) {
        if (thread.replyCount) call('get', `/api/comments/${thread.id}/replies/`, 'acc_client');
      }
    }
  });

  it('gives the sign-in accounts real histories', () => {
    const efua = call('get', '/api/bookings/?role=client', 'acc_client');
    expect(new Set(efua.map((b: any) => b.status))).toEqual(
      new Set(['completed', 'confirmed', 'awaiting_deposit', 'requested'])
    );
    expect(call('get', '/api/collections/', 'acc_client').length).toBe(5);
    expect(call('get', '/api/bookings/?role=stylist&status=requested', 'acc_ama').length).toBe(6);
    const ama = call('get', '/api/stylists/by-handle/braidsbyama/', 'acc_client');
    expect(ama.rating.count).toBeGreaterThan(3);
  });
});
