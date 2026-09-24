import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';
import { productById } from './shelf';

/** The style taxonomy. Seeded from what stylists actually call things. */
const STYLES = [
  ['knotless', 'Knotless braids'],
  ['box-braids', 'Box braids'],
  ['cornrows', 'Cornrows'],
  ['feed-in', 'Feed-in braids'],
  ['boho', 'Boho braids'],
  ['twists', 'Twists'],
  ['faux-locs', 'Faux locs'],
  ['locs', 'Locs'],
  ['silk-press', 'Silk press'],
  ['wash-and-go', 'Wash and go'],
  ['wig-install', 'Wig install'],
  ['bantu-knots', 'Bantu knots'],
].map(([id, name]) => ({ id, name }));

type StoredLook = (typeof db.looks)[number];

/** The style a service is, when its name says so: "Knotless braids" is knotless. */
export function styleForService(serviceName: string) {
  const name = serviceName.toLowerCase();
  const words = (s: string) =>
    s
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(w => w.length > 3);
  return (
    STYLES.find(s => name.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(name)) ??
    // "Boho knotless" still reads as knotless: match on a distinctive word.
    STYLES.find(s => words(s.name).some(w => w !== 'braids' && name.includes(w)))
  )?.id;
}

/**
 * A portfolio photo shared to Looks as it's added. Only a photo tagged with a
 * service whose style we can tell is shared: a look nobody can find by style is
 * just noise in the feed. Returns the new look's id, or nothing.
 */
export function lookFromPortfolio(stylistId: string, uri: string, serviceId?: string) {
  const service = (db.menus.get(stylistId) ?? []).find(s => s.id === serviceId);
  const style = service && styleForService(service.name);
  if (!service || !style) return undefined;
  const look: StoredLook = {
    id: `look_${Date.now()}_${db.looks.length}`,
    authorId: stylistId,
    photoUri: uri,
    serviceId: service.id,
    serviceName: service.name,
    price: service.price,
    fromPrice: service.fromPrice,
    stylistId,
    styles: [style],
    createdAt: new Date().toISOString(),
  };
  db.looks.unshift(look);
  return look.id;
}

/** Everyone this account has blocked, created empty the first time. */
function blocksOf(accountId: string) {
  const blocked = db.blocks.get(accountId) ?? new Set<string>();
  db.blocks.set(accountId, blocked);
  return blocked;
}

/** What a feed says about a person, read at request time like a join would. */
function person(accountId: string) {
  const account = db.accounts.get(accountId);
  const stylist = db.stylists.get(accountId);
  return {
    name: stylist?.displayName ?? account?.name ?? 'Someone',
    handle: stylist?.published ? stylist.handle : undefined,
    avatarUri: stylist?.avatarUri ?? account?.avatarUri,
  };
}

/** How many people have it in any of their collections, and whether this account does. */
function savesOf(lookId: string, accountId: string) {
  let count = 0;
  let saved = false;
  for (const [owner, collections] of db.collections) {
    if (collections.some(c => c.items.some(i => i.kind === 'look' && i.refId === lookId))) {
      count++;
      if (owner === accountId) saved = true;
    }
  }
  return { count, saved };
}

const commentLikesOf = (commentId: string) => {
  if (!db.commentLikes.has(commentId)) db.commentLikes.set(commentId, new Set());
  return db.commentLikes.get(commentId)!;
};

const likesOf = (lookId: string) => {
  if (!db.likes.has(lookId)) db.likes.set(lookId, new Set());
  return db.likes.get(lookId)!;
};

function present(look: StoredLook, accountId: string) {
  const author = person(look.authorId);
  const stylist = look.stylistId ? person(look.stylistId) : undefined;
  const saves = savesOf(look.id, accountId);
  return {
    ...look,
    // The media pipeline's grid size. Seeded photos can be asked for smaller; an
    // upload in the mock only has the one copy.
    thumbUri: look.photoUri.includes('unsplash.com')
      ? look.photoUri.replace(/w=d+/, 'w=400')
      : undefined,
    authorName: author.name,
    authorHandle: author.handle,
    authorAvatarUri: author.avatarUri,
    stylist:
      look.stylistId && stylist
        ? { id: look.stylistId, name: stylist.name, handle: stylist.handle }
        : undefined,
    area: look.stylistId ? db.stylists.get(look.stylistId)?.baseArea : undefined,
    products: (look.productIds ?? [])
      .map(id => productById(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map(({ id, brand, name }) => ({ id, brand, name })),
    visibility: look.visibility ?? 'public',
    likeCount: likesOf(look.id).size,
    liked: likesOf(look.id).has(accountId),
    commentCount: db.comments.filter(c => c.lookId === look.id).length,
    saveCount: saves.count,
    saved: saves.saved,
    mine: look.authorId === accountId,
  };
}

type StoredComment = (typeof db.comments)[number];

/** A comment as it's read: who wrote it, who it answers, and how many replies it has. */
function presentComment(comment: StoredComment, accountId: string, blocked: Set<string>) {
  const who = person(comment.authorId);
  const answered = comment.replyToId
    ? db.comments.find(c => c.id === comment.replyToId)
    : undefined;
  return {
    ...comment,
    authorName: who.name,
    authorAvatarUri: who.avatarUri,
    replyToName: answered ? person(answered.authorId).name : undefined,
    replyCount: comment.parentId
      ? undefined
      : db.comments.filter(c => c.parentId === comment.id && !blocked.has(c.authorId)).length,
    likeCount: commentLikesOf(comment.id).size,
    liked: commentLikesOf(comment.id).has(accountId),
    mine: comment.authorId === accountId,
  };
}

/** A page of any list, by the id of the last item already seen. */
function page<T extends { id: string }>(all: T[], cursor: string | null, limit: number) {
  const start = cursor ? all.findIndex(item => item.id === cursor) + 1 : 0;
  const items = all.slice(start, start + limit);
  return {
    items,
    nextCursor: start + limit < all.length ? items[items.length - 1]?.id : undefined,
  };
}

function visibleLook(id: string, accountId: string) {
  const look = db.looks.find(item => item.id === id);
  // A private look is its author's alone.
  const hidden = look?.visibility === 'private' && look.authorId !== accountId;
  if (!look || hidden || blocksOf(accountId).has(look.authorId)) {
    throw new MockError(404, 'That look is gone');
  }
  return look;
}

function report(accountId: string, target: Record<string, string>, body: any) {
  if (!body?.reason) throw new MockError(400, 'Say what’s wrong with it');
  db.reports.push({
    ...target,
    reason: String(body.reason),
    note: body?.note ? String(body.note) : undefined,
    reportedBy: accountId,
    at: new Date().toISOString(),
  });
  return null;
}

defineMocks({
  'GET /api/styles/': () => STYLES,

  'GET /api/looks/areas/': () =>
    [
      ...new Set(
        db.looks.map(l => (l.stylistId ? db.stylists.get(l.stylistId)?.baseArea : undefined))
      ),
    ]
      .filter(Boolean)
      .sort(),

  'GET /api/looks/': request => {
    // Public: anyone can read the feed. Signing in adds likes, blocks and her own.
    const accountId = request.accountId ?? '';
    const blocked = blocksOf(accountId);
    const limit = Number(request.query.get('limit') ?? 12);
    const cursor = request.query.get('cursor');
    const hair = request.query.get('hair');
    const style = request.query.get('style');
    const area = request.query.get('area');
    const words = (request.query.get('q') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    const matches = (look: (typeof db.looks)[number]) => {
      const stylist = look.stylistId ? db.stylists.get(look.stylistId) : undefined;
      const author = db.accounts.get(look.authorId);
      const text = [
        look.caption,
        look.serviceName,
        stylist?.displayName,
        author?.name,
        ...look.styles,
      ]
        .join(' ')
        .toLowerCase();
      return words.every(word => text.includes(word));
    };

    const visible = db.looks.filter(
      look =>
        !blocked.has(look.authorId) &&
        // Private looks never reach the feed — not even the author's own.
        look.visibility !== 'private' &&
        (!hair || look.hairTexture === hair) &&
        (!style || look.styles.includes(style)) &&
        (!area || (look.stylistId && db.stylists.get(look.stylistId)?.baseArea === area)) &&
        (!words.length || matches(look))
    );
    const start = cursor ? visible.findIndex(look => look.id === cursor) + 1 : 0;
    const page = visible.slice(start, start + limit);

    return {
      data: page.map(look => present(look, accountId)),
      nextCursor: start + limit < visible.length ? page[page.length - 1]?.id : undefined,
    };
  },

  // Her own looks, private ones included. Registered before :id so "mine" isn't read as one.
  'GET /api/looks/mine/': request => {
    const accountId = requireAccount(request);
    return db.looks.filter(l => l.authorId === accountId).map(l => present(l, accountId));
  },

  'GET /api/looks/:id/': request => {
    // Public: anyone can read the feed. Signing in adds likes, blocks and her own.
    const accountId = request.accountId ?? '';
    return present(visibleLook(request.params.id, accountId), accountId);
  },

  'POST /api/looks/': request => {
    const accountId = requireAccount(request);
    const body = request.body ?? {};
    const photoUri = String(body.photoUri ?? '').trim();
    if (!photoUri) throw new MockError(400, 'A look needs a photo');

    const styles: string[] = (Array.isArray(body.styles) ? body.styles : []).filter((id: string) =>
      STYLES.some(s => s.id === id)
    );
    if (!styles.length) throw new MockError(400, 'Tag the style');

    // Who did it is never typed in. A stylist is tagged through her own menu, a
    // client's stylist through a completed booking.
    let stylistId: string | undefined;
    let service: { id: string; name: string; price: number; fromPrice: boolean } | undefined;
    if (body.bookingId) {
      const booking = db.bookings.find(b => b.id === body.bookingId);
      if (!booking || booking.clientId !== accountId || booking.status !== 'completed') {
        throw new MockError(400, 'You can tag a stylist from a completed booking');
      }
      stylistId = booking.stylistId;
      service = (db.menus.get(stylistId) ?? []).find(item => item.id === booking.serviceId);
    } else if (db.stylists.get(accountId)?.published) {
      stylistId = accountId;
      service = (db.menus.get(accountId) ?? []).find(item => item.id === body.serviceId);
    }

    const look: StoredLook = {
      id: `look_${Date.now()}`,
      authorId: accountId,
      photoUri,
      caption: body.caption ? String(body.caption).trim() : undefined,
      serviceId: service?.id,
      serviceName: service?.name,
      price: service?.price,
      fromPrice: service?.fromPrice,
      stylistId,
      styles,
      hairTexture: body.hairTexture || undefined,
      // Only real catalogue products, and not too many to read.
      productIds: (Array.isArray(body.productIds) ? body.productIds : [])
        .filter((id: string) => !!productById(id))
        .slice(0, 5),
      visibility: body.visibility === 'private' ? 'private' : 'public',
      createdAt: new Date().toISOString(),
    };
    // Newest first.
    db.looks.unshift(look);
    return present(look, accountId);
  },

  'DELETE /api/looks/:id/': request => {
    const accountId = requireAccount(request);
    const look = db.looks.find(item => item.id === request.params.id);
    if (!look) throw new MockError(404, 'That look is already gone');
    if (look.authorId !== accountId) throw new MockError(403, 'That look isn’t yours');
    db.looks.splice(db.looks.indexOf(look), 1);
    return null;
  },

  'POST /api/looks/:id/like/': request => {
    const accountId = requireAccount(request);
    likesOf(visibleLook(request.params.id, accountId).id).add(accountId);
    return null;
  },

  'DELETE /api/looks/:id/like/': request => {
    const accountId = requireAccount(request);
    likesOf(visibleLook(request.params.id, accountId).id).delete(accountId);
    return null;
  },

  // The top of each thread, newest first. Replies come separately, when asked for,
  // so a look with a thousand replies costs one page to open.
  'GET /api/looks/:id/comments/': request => {
    // Public: anyone can read the conversation. Signing in adds blocks and her own.
    const accountId = request.accountId ?? '';
    const look = visibleLook(request.params.id, accountId);
    const blocked = blocksOf(accountId);
    const all = db.comments.filter(
      c => c.lookId === look.id && !c.parentId && !blocked.has(c.authorId)
    );
    // Newest first on request; otherwise ranked like the server (a simpler version):
    // likes, replies counting double, faded by age, her own fresh one first for her.
    const now = Date.now();
    const score = (c: (typeof all)[number]) => {
      const hours = Math.max(0, (now - Date.parse(c.createdAt)) / 3_600_000);
      const replies = db.comments.filter(r => r.parentId === c.id).length;
      const mineFresh = c.authorId === accountId && hours < 1 ? 1e9 : 0;
      return (commentLikesOf(c.id).size + 2 * replies + 1) / Math.pow(hours + 2, 1.2) + mineFresh;
    };
    const threads =
      request.query.get('sort') === 'new'
        ? [...all].reverse()
        : [...all].sort((a, b) => score(b) - score(a));
    const { items, nextCursor } = page(
      threads,
      request.query.get('cursor'),
      Number(request.query.get('limit') ?? 20)
    );
    return { data: items.map(c => presentComment(c, accountId, blocked)), nextCursor };
  },

  // One thread's replies, oldest first: a reply reads after what it answers.
  'GET /api/comments/:id/replies/': request => {
    const accountId = request.accountId ?? '';
    const root = db.comments.find(c => c.id === request.params.id && !c.parentId);
    if (!root) throw new MockError(404, 'That comment is gone');
    visibleLook(root.lookId, accountId);
    const blocked = blocksOf(accountId);
    const replies = db.comments.filter(c => c.parentId === root.id && !blocked.has(c.authorId));
    const { items, nextCursor } = page(
      replies,
      request.query.get('cursor'),
      Number(request.query.get('limit') ?? 10)
    );
    return { data: items.map(c => presentComment(c, accountId, blocked)), nextCursor };
  },

  'POST /api/looks/:id/comments/': request => {
    const accountId = requireAccount(request);
    const look = visibleLook(request.params.id, accountId);
    const body = String(request.body?.body ?? '').trim();
    if (!body) throw new MockError(400, 'Write something first');
    if (body.length > 500) throw new MockError(400, 'Keep it under 500 characters');
    // A reply joins the thread of whatever it answers, so threads never nest deeper.
    let answered: StoredComment | undefined;
    if (request.body?.replyTo) {
      answered = db.comments.find(c => c.id === request.body.replyTo && c.lookId === look.id);
      if (!answered) throw new MockError(404, 'That comment is gone');
      if (blocksOf(accountId).has(answered.authorId)) {
        throw new MockError(404, 'That comment is gone');
      }
    }
    const comment: StoredComment = {
      id: `com_${Date.now()}_${db.comments.length}`,
      lookId: look.id,
      authorId: accountId,
      body,
      parentId: answered ? (answered.parentId ?? answered.id) : undefined,
      replyToId: answered?.id,
      createdAt: new Date().toISOString(),
    };
    db.comments.push(comment);
    return presentComment(comment, accountId, blocksOf(accountId));
  },

  'DELETE /api/comments/:id/': request => {
    const accountId = requireAccount(request);
    const comment = db.comments.find(c => c.id === request.params.id);
    if (!comment) throw new MockError(404, 'That comment is already gone');
    if (comment.authorId !== accountId) throw new MockError(403, 'That comment isn’t yours');
    // A thread goes with its first comment. A reply goes alone; anything answering it stays.
    db.comments = db.comments.filter(c => c.id !== comment.id && c.parentId !== comment.id);
    return null;
  },

  'POST /api/comments/:id/like/': request => {
    const accountId = requireAccount(request);
    const comment = db.comments.find(c => c.id === request.params.id);
    if (!comment) throw new MockError(404, 'That comment is gone');
    visibleLook(comment.lookId, accountId);
    commentLikesOf(comment.id).add(accountId);
    return null;
  },

  'DELETE /api/comments/:id/like/': request => {
    const accountId = requireAccount(request);
    commentLikesOf(String(request.params.id)).delete(accountId);
    return null;
  },

  'POST /api/looks/:id/report/': request => {
    const accountId = requireAccount(request);
    const look = db.looks.find(item => item.id === request.params.id);
    if (!look) throw new MockError(404, 'That look is already gone');
    return report(accountId, { lookId: look.id }, request.body);
  },

  'POST /api/comments/:id/report/': request => {
    const accountId = requireAccount(request);
    const comment = db.comments.find(c => c.id === request.params.id);
    if (!comment) throw new MockError(404, 'That comment is already gone');
    return report(accountId, { commentId: comment.id }, request.body);
  },

  'POST /api/stylists/:id/report/': request => {
    const accountId = requireAccount(request);
    if (!db.stylists.has(request.params.id)) throw new MockError(404, 'No page to report');
    return report(accountId, { profileId: request.params.id }, request.body);
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
