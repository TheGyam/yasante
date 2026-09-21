import { matchRoute, MockError } from '@/shared/lib/api/mock';
import { db } from '../db';
import '../looks';
import '../stylist';

const call = (method: string, url: string, accountId: string, body?: unknown) => {
  const match = matchRoute(method, url);
  if (!match) throw new Error(`no handler for ${method} ${url}`);
  return match.route.handler({ params: match.params, query: match.query, body, accountId }) as any;
};

const CLIENT = 'acc_client';
const feed = (query = '', who = CLIENT) =>
  call('get', `/api/looks/${query}`, who).data.map((l: any) => l.id);

afterEach(() => {
  db.blocks.clear();
  db.likes.set('look_seed_2', new Set(['acc_ama']));
});

describe('the feed', () => {
  it('narrows by hair, style and area, together', () => {
    expect(feed('?hair=coily')).toEqual(['look_seed_1', 'look_seed_3']);
    expect(feed('?style=cornrows')).toEqual(['look_seed_3']);
    expect(feed('?area=Peckham')).toEqual(['look_seed_1']);
    expect(feed('?hair=coily&area=Dalston')).toEqual(['look_seed_3']);
    expect(feed('?hair=straight')).toEqual([]);
  });

  it('says who did the hair and what it costs', () => {
    const look = call('get', '/api/looks/look_seed_1/', CLIENT);
    expect(look).toMatchObject({
      stylist: { id: 'acc_ama', handle: 'braidsbyama' },
      serviceId: 'men_knotless',
      area: 'Peckham',
      liked: true,
      likeCount: 2,
    });
  });
});

describe('likes', () => {
  it('count once per person, and come off again', () => {
    call('post', '/api/looks/look_seed_2/like/', CLIENT);
    call('post', '/api/looks/look_seed_2/like/', CLIENT);
    expect(call('get', '/api/looks/look_seed_2/', CLIENT)).toMatchObject({
      liked: true,
      likeCount: 2,
    });
    call('delete', '/api/looks/look_seed_2/like/', CLIENT);
    expect(call('get', '/api/looks/look_seed_2/', CLIENT).likeCount).toBe(1);
  });
});

describe('comments', () => {
  it('are added, counted, and only deleted by whoever wrote them', () => {
    const before = call('get', '/api/looks/look_seed_2/', CLIENT).commentCount;
    const comment = call('post', '/api/looks/look_seed_2/comments/', CLIENT, {
      body: '  Love it ',
    });
    expect(comment).toMatchObject({ body: 'Love it', mine: true });
    expect(call('get', '/api/looks/look_seed_2/', CLIENT).commentCount).toBe(before + 1);

    expect(() => call('delete', `/api/comments/${comment.id}/`, 'acc_ama')).toThrow(MockError);
    call('delete', `/api/comments/${comment.id}/`, CLIENT);
    expect(call('get', '/api/looks/look_seed_2/', CLIENT).commentCount).toBe(before);
  });

  it('refuse an empty one', () => {
    expect(() => call('post', '/api/looks/look_seed_2/comments/', CLIENT, { body: '   ' })).toThrow(
      MockError
    );
  });
});

describe('blocking', () => {
  it('hides their looks, their comments and their page, both ways', () => {
    call('post', '/api/blocks/', CLIENT, { accountId: 'acc_zainab' });
    expect(feed()).toEqual(['look_seed_1']);
    const comments = call('get', '/api/looks/look_seed_1/comments/', CLIENT).data;
    expect(comments.some((c: any) => c.authorId === 'acc_zainab')).toBe(false);
    expect(() => call('get', '/api/stylists/by-handle/zainabdoeshair/', CLIENT)).toThrow(MockError);
  });
});

describe('posting', () => {
  it('needs a style, and credits a client’s stylist only through a completed booking', () => {
    expect(() => call('post', '/api/looks/', CLIENT, { photoUri: 'x', styles: [] })).toThrow(
      /style/
    );
    expect(() =>
      call('post', '/api/looks/', CLIENT, {
        photoUri: 'x',
        styles: ['knotless'],
        bookingId: 'bk_seed_zainab',
      })
    ).toThrow(/completed booking/);

    const look = call('post', '/api/looks/', CLIENT, {
      photoUri: 'x',
      styles: ['knotless'],
      bookingId: 'bk_seed_efua',
      hairTexture: 'coily',
    });
    expect(look).toMatchObject({
      authorId: CLIENT,
      stylist: { id: 'acc_ama' },
      serviceId: 'men_knotless',
      price: 120,
    });
    db.looks.splice(db.looks.indexOf(db.looks.find(l => l.id === look.id)!), 1);
  });
});

describe('a private look', () => {
  it('is hers alone: not in the feed, not to anyone else, but on her own page', () => {
    const look = call('post', '/api/looks/', CLIENT, {
      photoUri: 'x',
      styles: ['twists'],
      visibility: 'private',
      productIds: ['prd_1', 'not-a-product'],
    });
    expect(look).toMatchObject({ visibility: 'private', products: [{ id: 'prd_1' }] });
    expect(feed()).not.toContain(look.id);
    expect(() => call('get', `/api/looks/${look.id}/`, 'acc_ama')).toThrow(MockError);
    expect(call('get', `/api/looks/${look.id}/`, CLIENT).id).toBe(look.id);
    expect(call('get', '/api/looks/mine/', CLIENT).map((l: any) => l.id)).toContain(look.id);
    db.looks.splice(db.looks.indexOf(db.looks.find(l => l.id === look.id)!), 1);
  });
});
