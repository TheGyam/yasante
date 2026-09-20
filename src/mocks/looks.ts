import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

/** Everyone this account has blocked, created empty the first time. */
function blocksOf(accountId: string) {
  const blocked = db.blocks.get(accountId) ?? new Set<string>();
  db.blocks.set(accountId, blocked);
  return blocked;
}

/** What the feed says about whoever posted, read at request time like a join would. */
function author(accountId: string) {
  const account = db.accounts.get(accountId);
  const stylist = db.stylists.get(accountId);
  return {
    authorId: accountId,
    authorName: stylist?.displayName ?? account?.name ?? 'Someone',
    authorHandle: stylist?.published ? stylist.handle : undefined,
    authorAvatarUri: stylist?.avatarUri ?? account?.avatarUri,
  };
}

defineMocks({
  'GET /api/looks/': request => {
    const accountId = requireAccount(request);
    const blocked = blocksOf(accountId);
    const limit = Number(request.query.get('limit') ?? 12);
    const cursor = request.query.get('cursor');

    const visible = db.looks.filter(look => !blocked.has(look.authorId));
    const start = cursor ? visible.findIndex(look => look.id === cursor) + 1 : 0;
    const page = visible.slice(start, start + limit);

    return {
      data: page.map(look => ({
        ...look,
        ...author(look.authorId),
        mine: look.authorId === accountId,
      })),
      nextCursor: start + limit < visible.length ? page[page.length - 1]?.id : undefined,
    };
  },

  'POST /api/looks/': request => {
    const accountId = requireAccount(request);
    const photoUri = String(request.body?.photoUri ?? '').trim();
    if (!photoUri) throw new MockError(400, 'A look needs a photo');

    const service = (db.menus.get(accountId) ?? []).find(
      item => item.id === request.body?.serviceId
    );
    const look = {
      id: `look_${Date.now()}`,
      authorId: accountId,
      photoUri,
      caption: request.body?.caption ? String(request.body.caption).trim() : undefined,
      serviceName: service?.name,
      price: service?.price,
      fromPrice: service?.fromPrice,
      createdAt: new Date().toISOString(),
    };
    // Newest first.
    db.looks.unshift(look);
    return { ...look, ...author(accountId), mine: true };
  },

  'DELETE /api/looks/:id/': request => {
    const accountId = requireAccount(request);
    const look = db.looks.find(item => item.id === request.params.id);
    if (!look) throw new MockError(404, 'That look is already gone');
    if (look.authorId !== accountId) throw new MockError(403, 'That look isn’t yours');
    db.looks.splice(db.looks.indexOf(look), 1);
    return null;
  },

  'POST /api/looks/:id/report/': request => {
    const accountId = requireAccount(request);
    const look = db.looks.find(item => item.id === request.params.id);
    if (!look) throw new MockError(404, 'That look is already gone');
    if (!request.body?.reason) throw new MockError(400, 'Say what’s wrong with it');
    db.reports.push({
      lookId: look.id,
      reason: String(request.body.reason),
      note: request.body?.note ? String(request.body.note) : undefined,
      reportedBy: accountId,
      at: new Date().toISOString(),
    });
    return null;
  },

  'POST /api/blocks/': request => {
    const accountId = requireAccount(request);
    const blockedId = String(request.body?.accountId ?? '');
    if (!blockedId || blockedId === accountId) throw new MockError(400, 'Nobody to block');
    blocksOf(accountId).add(blockedId);
    // Blocking runs both ways: neither sees the other again.
    blocksOf(blockedId).add(accountId);
    return null;
  },
});
