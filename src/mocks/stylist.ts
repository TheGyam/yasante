import { NOT_HANDLES } from '@/shared/lib/links';
import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { TIMING_REASONS } from '@/features/booking/types';
import { respondedAt } from './bookings';
import { lookFromPortfolio } from './looks';
import { db } from './db';

/** Handles already in use, plus the ones we keep for ourselves. */
// The site's own paths too, so yasante.com/{handle} can never be ambiguous.
const RESERVED = new Set(['yasante', 'admin', 'stylist', 'hair', ...NOT_HANDLES]);

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
    // Only well-formed options survive: a known group, a name, a price that isn't negative.
    options: (Array.isArray(body?.options) ? body.options : [])
      .filter(
        (o: any) =>
          (o?.group === 'length' || o?.group === 'size') &&
          String(o?.label ?? '').trim() &&
          Number(o?.add) >= 0
      )
      .map((o: any, i: number) => ({
        id: String(o.id || `opt_${i}`),
        group: o.group,
        label: String(o.label).trim(),
        add: Number(o.add),
        addMinutes: o.addMinutes ? Number(o.addMinutes) : undefined,
      })),
    hairIncluded: !!body?.hairIncluded,
  };
}

/** Only complete ones, and few enough to pick from at a glance. */
function paymentMethods(list: unknown) {
  if (!Array.isArray(list)) throw new MockError(400, 'Send a list of payment methods');
  const kept = list
    .map((m: any, i: number) => ({
      id: String(m?.id || `pay_${Date.now()}_${i}`),
      label: String(m?.label ?? '')
        .trim()
        .slice(0, 40),
      details: String(m?.details ?? '')
        .trim()
        .slice(0, 200),
    }))
    .filter(m => m.label && m.details);
  if (kept.length > 5) throw new MockError(400, 'Keep it to five ways to be paid');
  return kept;
}

const taken = (handle: string) =>
  RESERVED.has(handle) || [...db.stylists.values()].some(s => s.handle === handle);

/**
 * Only what moderation has passed, and nothing that says who the client is. The
 * average counts every published review; the page carries the latest ten.
 */
function reviewsFor(stylistId: string) {
  const published = db.reviews
    .filter(r => r.stylistId === stylistId && r.status === 'published')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = published.reduce((sum, r) => sum + r.rating, 0);
  return {
    reviews: published.slice(0, 10).map(({ stylistId: _s, clientId: _c, ...review }) => review),
    rating: published.length
      ? { average: Math.round((total / published.length) * 10) / 10, count: published.length }
      : undefined,
  };
}

const YEAR = 365 * 86_400_000;

/**
 * The public timing label, and only when it's earned: 10 completed appointments
 * and 6 usable timing records in the last 12 months, and one outcome at 60% or
 * more. Records blamed on the client, or contested by her, don't count.
 */
export function timingLabelFor(stylistId: string, now = Date.now()) {
  const recent = db.bookings.filter(
    b =>
      b.stylistId === stylistId &&
      b.status === 'completed' &&
      now - new Date(b.completedAt ?? b.updatedAt).getTime() < YEAR
  );
  if (recent.length < 10) return undefined;
  const usable = recent.filter(b => {
    if (!b.timing || b.contested?.timing) return false;
    const side = TIMING_REASONS.find(r => r.value === b.timing?.reason)?.side;
    return side !== 'client';
  });
  if (usable.length < 6) return undefined;
  for (const outcome of ['on_time', 'early', 'over'] as const) {
    const count = usable.filter(b => b.timing?.outcome === outcome).length;
    if (count / usable.length >= 0.6) return { outcome, count, sample: usable.length };
  }
  return undefined;
}

/** Her usual time to answer: the median, so one slow weekend doesn't define her. */
function responseHoursFor(stylistId: string) {
  const hours = db.bookings
    .filter(b => b.stylistId === stylistId && respondedAt.has(b.id))
    .map(
      b =>
        (new Date(respondedAt.get(b.id)!).getTime() - new Date(b.createdAt).getTime()) / 3_600_000
    )
    .sort((a, b) => a - b);
  if (!hours.length) return undefined;
  return Math.round(hours[Math.floor(hours.length / 2)] * 10) / 10;
}

const WEEK = 7 * 86_400_000;
const BUCKET_MINUTES = { under_30: 15, '30_60': 45, '1_2h': 90, '2h_plus': 150 } as const;

/** Monday 00:00 of the week `at` falls in. */
function mondayOf(at: Date) {
  const day = new Date(at);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

function countWeek(stylistId: string, from: number, to: number) {
  const inWeek = (iso?: string) => {
    const t = iso ? new Date(iso).getTime() : NaN;
    return t >= from && t < to;
  };
  const mine = db.bookings.filter(b => b.stylistId === stylistId);
  const completed = mine.filter(b => b.status === 'completed' && inWeek(b.completedAt));
  return {
    views: db.pageViews.filter(v => v.stylistId === stylistId && inWeek(v.at)).length,
    requests: mine.filter(b => inWeek(b.createdAt)).length,
    confirmed: mine.filter(
      b => (b.status === 'confirmed' || b.status === 'completed') && inWeek(b.scheduledFor)
    ).length,
    completed: completed.length,
    noShows: mine.filter(b => b.status === 'no_show' && inWeek(b.scheduledFor)).length,
    lateCancellations: mine.filter(b => b.status === 'cancelled_late' && inWeek(b.updatedAt))
      .length,
    earned: completed.reduce((sum, b) => sum + (b.actualPrice ?? 0), 0),
  };
}

/**
 * How each service really runs. Duration is the estimate plus the recorded
 * deviation, taken at the middle of its bucket — the plan's rule, never minutes.
 */
export function timingFor(stylistId: string) {
  const menu = db.menus.get(stylistId) ?? [];
  const records = db.bookings.filter(
    b => b.stylistId === stylistId && b.status === 'completed' && b.timing
  );
  return menu
    .map(item => {
      const mine = records.filter(b => b.serviceId === item.id);
      const actual = mine
        .filter(b => b.durationMinutes)
        .map(b => {
          const shift = b.timing!.bucket ? BUCKET_MINUTES[b.timing!.bucket] : 0;
          const sign = b.timing!.outcome === 'over' ? 1 : b.timing!.outcome === 'early' ? -1 : 0;
          return b.durationMinutes! + sign * shift;
        })
        .sort((a, b) => a - b);
      return {
        serviceId: item.id,
        serviceName: item.name,
        quotedMinutes: item.durationMinutes,
        typicalMinutes: actual.length ? actual[Math.floor(actual.length / 2)] : undefined,
        sample: mine.length,
        early: mine.filter(b => b.timing!.outcome === 'early').length,
        onTime: mine.filter(b => b.timing!.outcome === 'on_time').length,
        over: mine.filter(b => b.timing!.outcome === 'over').length,
        clientSide: mine.filter(
          b => TIMING_REASONS.find(r => r.value === b.timing!.reason)?.side === 'client'
        ).length,
      };
    })
    .filter(t => t.sample > 0);
}

export function numbersFor(stylistId: string, now = new Date()) {
  const monday = mondayOf(now).getTime();
  return {
    weekOf: new Date(monday).toISOString(),
    thisWeek: countWeek(stylistId, monday, monday + WEEK),
    lastWeek: countWeek(stylistId, monday - WEEK, monday),
    timing: timingFor(stylistId),
  };
}

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
    // Blocking runs both ways, pages included.
    if (request.accountId && db.blocks.get(request.accountId)?.has(profile.accountId)) {
      throw new MockError(404, 'No page at that address');
    }
    if (request.accountId !== profile.accountId) {
      db.pageViews.push({ stylistId: profile.accountId, at: new Date().toISOString() });
    }
    return {
      // The proof photo is for the verification queue, and her payment details go
      // only to a client she's accepted — neither is on her page.
      profile: { ...profile, proofPhotoUri: undefined, paymentMethods: undefined },
      menu: db.menus.get(profile.accountId) ?? [],
      photos: db.portfolios.get(profile.accountId) ?? [],
      confirmedStyles: db.bookings.filter(
        b => b.stylistId === profile.accountId && b.status === 'completed'
      ).length,
      ...reviewsFor(profile.accountId),
      responseHours: responseHoursFor(profile.accountId),
      timingLabel: timingLabelFor(profile.accountId),
    };
  },

  'GET /api/stylists/me/': request => {
    const profile = db.stylists.get(requireAccount(request));
    if (!profile) throw new MockError(404, 'No stylist profile yet');
    return profile;
  },

  'GET /api/stylists/me/numbers/': request => numbersFor(requireAccount(request)),

  'GET /api/stylists/me/summary/': request => {
    const accountId = requireAccount(request);
    return { pendingRequests: db.pendingRequests.get(accountId) ?? 0, appointmentsToday: 0 };
  },

  'GET /api/stylists/': request => {
    const words = (request.query.get('q') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return [...db.stylists.values()]
      .filter(p => p.published)
      .filter(p => {
        const text = `${p.displayName} ${p.handle} ${p.baseArea}`.toLowerCase();
        return words.every(word => text.includes(word));
      })
      .slice(0, 20)
      .map(p => ({
        accountId: p.accountId,
        handle: p.handle,
        displayName: p.displayName,
        avatarUri: p.avatarUri,
        baseArea: p.baseArea,
      }));
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
    const changes = { ...request.body };
    if ('paymentMethods' in changes)
      changes.paymentMethods = paymentMethods(changes.paymentMethods);
    Object.assign(profile, changes);
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
    Object.assign(item, newItem({ ...item, ...request.body }));
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
    const accountId = requireAccount(request);
    const drafts = request.body?.photos ?? [];
    if (!Array.isArray(drafts) || !drafts.length) throw new MockError(400, 'No photos to add');
    // Shared to the feed only from a live page: a draft page has nobody to send clients to.
    const share = !!request.body?.postAsLooks && !!db.stylists.get(accountId)?.published;
    const checked = drafts.map((draft: any) => {
      const uri = String(draft?.uri ?? '').trim();
      if (!uri) throw new MockError(400, 'A photo needs a picture');
      return { uri, serviceId: draft?.serviceId ? String(draft.serviceId) : undefined };
    });
    const added = checked.map(({ uri, serviceId }, index) => ({
      id: `pho_${Date.now()}_${index}`,
      uri,
      serviceId,
      lookId: share ? lookFromPortfolio(accountId, uri, serviceId) : undefined,
      createdAt: new Date().toISOString(),
    }));
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
