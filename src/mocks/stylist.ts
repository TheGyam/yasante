import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

/** Handles already in use, plus the ones we keep for ourselves. */
const RESERVED = new Set(['yasante', 'admin', 'help', 'support', 'stylist', 'hair']);

/** Her menu, created empty the first time she adds to it. */
function menuOf(accountId: string) {
  const menu = db.menus.get(accountId) ?? [];
  db.menus.set(accountId, menu);
  return menu;
}

/** Her portfolio, created empty the first time she imports into it. */
function portfolioOf(accountId: string) {
  const photos = db.portfolios.get(accountId) ?? [];
  db.portfolios.set(accountId, photos);
  return photos;
}

/** What the server would keep from a posted draft, and nothing else. */
function newItem(body: any) {
  const name = String(body?.name ?? '').trim();
  const price = Number(body?.price);
  if (!name || !Number.isFinite(price) || price <= 0) {
    throw new MockError(400, 'A service needs a name and a price');
  }
  return {
    name,
    price,
    fromPrice: !!body?.fromPrice,
    durationMinutes: body?.durationMinutes ? Number(body.durationMinutes) : undefined,
    note: body?.note ? String(body.note).trim() : undefined,
  };
}

const taken = (handle: string) =>
  RESERVED.has(handle) || [...db.stylists.values()].some(s => s.handle === handle);

defineMocks({
  'GET /api/stylists/handle-available/': ({ query }) => {
    const handle = (query.get('handle') ?? '').toLowerCase();
    if (!taken(handle)) return { handle, available: true };
    return {
      handle,
      available: false,
      suggestions: [`${handle}hair`, `${handle}.london`, `${handle}studio`].filter(s => !taken(s)),
    };
  },

  'GET /api/stylists/by-handle/:handle/': request => {
    const handle = String(request.params.handle ?? '').toLowerCase();
    const profile = [...db.stylists.values()].find(s => s.handle === handle);
    // A draft page is nobody's business until she puts it live.
    if (!profile?.published) throw new MockError(404, 'No page at that address');
    return {
      // The proof photo is for the verification queue, never for clients.
      profile: { ...profile, proofPhotoUri: undefined },
      menu: db.menus.get(profile.accountId) ?? [],
      photos: db.portfolios.get(profile.accountId) ?? [],
      confirmedStyles: db.bookings.filter(
        b => b.stylistId === profile.accountId && b.status === 'completed'
      ).length,
    };
  },

  'GET /api/stylists/me/': request => {
    const profile = db.stylists.get(requireAccount(request));
    if (!profile) throw new MockError(404, 'No stylist profile yet');
    return profile;
  },

  'GET /api/stylists/me/summary/': request => {
    const accountId = requireAccount(request);
    return { pendingRequests: db.pendingRequests.get(accountId) ?? 0, appointmentsToday: 0 };
  },

  'POST /api/stylists/': request => {
    const accountId = requireAccount(request);
    if (db.stylists.has(accountId)) throw new MockError(400, 'You already have a stylist page');
    const handle = String(request.body?.handle ?? '').toLowerCase();
    if (taken(handle)) throw new MockError(409, 'That handle has just been taken');
    const profile = {
      ...request.body,
      handle,
      id: `sty_${Date.now()}`,
      accountId,
      verificationTier: 0 as const,
      published: false,
      createdAt: new Date().toISOString(),
    };
    db.stylists.set(accountId, profile);
    // Setting up a page is what makes an account a stylist.
    const account = db.accounts.get(accountId)!;
    if (!account.roles?.includes('stylist')) account.roles = [...(account.roles ?? []), 'stylist'];
    return profile;
  },

  'PATCH /api/stylists/me/': request => {
    const accountId = requireAccount(request);
    const profile = db.stylists.get(accountId);
    if (!profile) throw new MockError(404, 'No stylist profile yet');
    Object.assign(profile, request.body);
    return profile;
  },

  'POST /api/stylists/me/publish/': request => {
    const accountId = requireAccount(request);
    const profile = db.stylists.get(accountId);
    if (!profile) throw new MockError(404, 'No stylist profile yet');
    if (!db.accounts.get(accountId)?.phoneVerified) {
      throw new MockError(403, 'Verify your mobile number before your page goes live');
    }
    profile.published = true;
    return profile;
  },

  'GET /api/stylists/me/menu/': request => db.menus.get(requireAccount(request)) ?? [],

  'POST /api/stylists/me/menu/': request => {
    const item = { ...newItem(request.body), id: `men_${Date.now()}` };
    menuOf(requireAccount(request)).push(item);
    return item;
  },

  'PATCH /api/stylists/me/menu/:id/': request => {
    const item = menuOf(requireAccount(request)).find(i => i.id === request.params.id);
    if (!item) throw new MockError(404, 'That service is no longer on your menu');
    Object.assign(item, request.body);
    return item;
  },

  'DELETE /api/stylists/me/menu/:id/': request => {
    const accountId = requireAccount(request);
    db.menus.set(
      accountId,
      menuOf(accountId).filter(item => item.id !== request.params.id)
    );
    return null;
  },

  'POST /api/stylists/me/menu/import/': request => {
    const menu = menuOf(requireAccount(request));
    const added = (request.body?.items ?? []).map((draft: unknown, index: number) => ({
      ...newItem(draft),
      id: `men_${Date.now()}_${index}`,
    }));
    menu.push(...added);
    return added;
  },

  'GET /api/stylists/me/portfolio/': request => db.portfolios.get(requireAccount(request)) ?? [],

  'POST /api/stylists/me/portfolio/': request => {
    const photos = portfolioOf(requireAccount(request));
    const drafts = request.body?.photos ?? [];
    if (!Array.isArray(drafts) || !drafts.length) throw new MockError(400, 'No photos to add');
    const added = drafts.map((draft: any, index: number) => {
      const uri = String(draft?.uri ?? '').trim();
      if (!uri) throw new MockError(400, 'A photo needs a picture');
      return {
        id: `pho_${Date.now()}_${index}`,
        uri,
        serviceId: draft?.serviceId ? String(draft.serviceId) : undefined,
        createdAt: new Date().toISOString(),
      };
    });
    // Newest first, the way she'll want to see them.
    photos.unshift(...added);
    return added;
  },

  'PATCH /api/stylists/me/portfolio/:id/': request => {
    const photo = portfolioOf(requireAccount(request)).find(p => p.id === request.params.id);
    if (!photo) throw new MockError(404, 'That photo is no longer in your portfolio');
    // An untagged photo clears the field rather than storing an empty string.
    if ('serviceId' in (request.body ?? {})) photo.serviceId = request.body.serviceId || undefined;
    return photo;
  },

  'DELETE /api/stylists/me/portfolio/:id/': request => {
    const accountId = requireAccount(request);
    db.portfolios.set(
      accountId,
      portfolioOf(accountId).filter(photo => photo.id !== request.params.id)
    );
    return null;
  },
});
