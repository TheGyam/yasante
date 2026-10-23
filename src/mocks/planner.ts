import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

type MockCollection = NonNullable<ReturnType<typeof db.collections.get>>[number];
type MockPlan = NonNullable<ReturnType<typeof db.carePlans.get>>[number];

function collectionsOf(accountId: string) {
  const collections = db.collections.get(accountId) ?? [];
  db.collections.set(accountId, collections);
  return collections;
}

function plansOf(accountId: string) {
  const plans = db.carePlans.get(accountId) ?? [];
  db.carePlans.set(accountId, plans);
  return plans;
}

function ownCollection(accountId: string, id: string) {
  const found = collectionsOf(accountId).find(collection => collection.id === id);
  if (!found) throw new MockError(404, 'That collection is gone');
  return found;
}

function ownPlan(accountId: string, id: string) {
  const found = plansOf(accountId).find(plan => plan.id === id);
  if (!found) throw new MockError(404, 'That plan is gone');
  return found;
}

/** A link's code: random and long enough that it can't be guessed or counted through. */
const newCode = () =>
  Array.from({ length: 22 }, () =>
    'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(
      Math.floor(Math.random() * 56)
    )
  ).join('');

const SHARE_BASE = 'https://yasante.com';

function author(accountId: string) {
  const account = db.accounts.get(accountId);
  return {
    id: accountId,
    name: account?.name ?? 'Someone',
    username: account?.username,
    avatarUri: account?.avatarUri,
  };
}

/** The shared one a code points at, if it's still shared. */
function sharedCollection(code: string) {
  for (const [accountId, list] of db.collections) {
    const found = list.find(c => c.code === code && !c.follows);
    if (found) return { accountId, collection: found };
  }
  return undefined;
}

function sharedPlan(code: string) {
  for (const [accountId, list] of db.carePlans) {
    const found = list.find(p => p.code === code && !p.follows);
    if (found) return { accountId, plan: found };
  }
  return undefined;
}

/** What a followed one reads: its source, while it's still shared. */
function sourceOf<
  T extends { id: string; code?: string; follows?: { accountId: string; id: string } },
>(row: T, lists: Map<string, T[]>) {
  if (!row.follows) return undefined;
  const source = lists.get(row.follows.accountId)?.find(item => item.id === row.follows!.id);
  return source?.code ? { accountId: row.follows.accountId, source } : undefined;
}

/** How many follow it, and how many made it theirs: counts only, never who. */
function counts(
  accountId: string,
  row: { id: string; seedFollowers?: number; madeItTheirs?: number }
) {
  let following = 0;
  for (const list of [...db.collections.values(), ...db.carePlans.values()]) {
    following += list.filter(
      item => item.follows?.accountId === accountId && item.follows.id === row.id
    ).length;
  }
  return { followers: following + (row.seedFollowers ?? 0), madeItTheirs: row.madeItTheirs ?? 0 };
}

const followingOf = (followed: {
  accountId: string;
  source: { code?: string; updatedAt?: string; createdAt: string };
}) => ({
  author: author(followed.accountId),
  code: followed.source.code!,
  updatedAt: followed.source.updatedAt ?? followed.source.createdAt,
});

/** The card needs a count and a picture; the server would compute both. */
function summarise(accountId: string, collection: MockCollection) {
  const followed = sourceOf(collection, db.collections);
  const shown = followed?.source ?? collection;
  const pictures = shown.items
    .map(item => item.imageUri)
    .filter((uri): uri is string => !!uri)
    .slice(0, 4);
  return {
    id: collection.id,
    name: shown.name,
    sharing: collection.code ? 'link' : 'private',
    isPrivate: !collection.code,
    createdAt: collection.createdAt,
    itemCount: shown.items.length,
    coverUri: pictures[0],
    previewUris: pictures,
    ...(collection.code && {
      shareUrl: `${SHARE_BASE}/c/${collection.code}`,
      ...counts(accountId, collection),
    }),
    ...(followed && { following: followingOf(followed) }),
    basedOn: collection.basedOn,
  };
}

function describePlanRow(accountId: string, plan: MockPlan) {
  const followed = sourceOf(plan, db.carePlans);
  const code = plan.code;
  return {
    id: plan.id,
    name: plan.name,
    frequency: plan.frequency,
    specificDays: plan.specificDays,
    timeOfDay: plan.timeOfDay,
    remindersOn: plan.remindersOn,
    steps: plan.steps,
    lastDoneAt: plan.lastDoneAt,
    createdAt: plan.createdAt,
    madeItTheirs: plan.madeItTheirs,
    basedOn: plan.basedOn,
    // Followed: the author's name and steps, her own schedule.
    ...(followed && {
      name: followed.source.name,
      steps: followed.source.steps,
      following: followingOf(followed),
    }),
    sharing: code ? 'link' : 'private',
    ...(code && { shareUrl: `${SHARE_BASE}/p/${code}`, ...counts(accountId, plan) }),
  };
}

/** Gone from her Planner once its author stops sharing it or deletes it. */
function stillThere<
  T extends { id: string; code?: string; follows?: { accountId: string; id: string } },
>(row: T, lists: Map<string, T[]>) {
  return !row.follows || !!sourceOf(row, lists);
}

/** Her name for it, unless she already has one called that: then "Winter braids 2". */
function freeName(taken: string[], wanted: string) {
  const names = new Set(taken.map(name => name.toLowerCase()));
  if (!names.has(wanted.toLowerCase())) return wanted;
  let n = 2;
  while (names.has(`${wanted} ${n}`.toLowerCase())) n += 1;
  return `${wanted} ${n}`;
}

/** What a saved thing looks like, read off whatever it points at. */
function describeItem(kind: string, refId: string) {
  if (kind === 'look') {
    const look = db.looks.find(item => item.id === refId);
    if (!look) throw new MockError(404, 'That look is gone');
    return { imageUri: look.photoUri, title: look.caption ?? look.serviceName };
  }
  // Content lives on the real API, so the app sends what it already has on screen.
  return {};
}

function makeCollectionHers(
  accountId: string,
  source: MockCollection,
  sourceAccount: string,
  name: string
) {
  source.madeItTheirs = (source.madeItTheirs ?? 0) + 1;
  const copy: MockCollection = {
    id: `col_${Date.now()}`,
    name: freeName(
      collectionsOf(accountId)
        .filter(c => !c.follows)
        .map(c => c.name),
      name.trim() || source.name
    ),
    isPrivate: true,
    createdAt: new Date().toISOString(),
    basedOn: { name: source.name, authorName: author(sourceAccount).name, code: source.code },
    items: source.items.map((item, i) => ({ ...item, id: `ci_${Date.now()}_${i}` })),
  };
  collectionsOf(accountId).unshift(copy);
  return copy;
}

function makePlanHers(
  accountId: string,
  source: MockPlan,
  sourceAccount: string,
  name: string,
  schedule?: Partial<MockPlan>
) {
  source.madeItTheirs = (source.madeItTheirs ?? 0) + 1;
  const plan: MockPlan = {
    id: `plan_${Date.now()}`,
    name: freeName(
      plansOf(accountId)
        .filter(p => !p.follows)
        .map(p => p.name),
      name.trim() || source.name
    ),
    frequency: schedule?.frequency ?? source.frequency,
    specificDays: schedule?.specificDays ?? source.specificDays,
    timeOfDay: schedule?.timeOfDay ?? source.timeOfDay,
    remindersOn: schedule?.remindersOn ?? false,
    steps: source.steps.map((step, i) => ({ id: `step_${Date.now()}_${i}`, text: step.text })),
    lastDoneAt: schedule?.lastDoneAt,
    createdAt: new Date().toISOString(),
    basedOn: { name: source.name, authorName: author(sourceAccount).name, code: source.code },
    sessions: schedule?.sessions ?? [],
  };
  plansOf(accountId).unshift(plan);
  return plan;
}

const NOT_SHARED = 'This isn’t shared any more';
const NOT_HERS = 'This one is someone else’s to change';

defineMocks({
  'GET /api/collections/': request => {
    const accountId = requireAccount(request);
    return collectionsOf(accountId)
      .filter(c => stillThere(c, db.collections))
      .map(c => summarise(accountId, c));
  },

  'POST /api/collections/': request => {
    const name = String(request.body?.name ?? '').trim();
    if (!name) throw new MockError(400, 'Name your collection');
    const accountId = requireAccount(request);
    const collection: MockCollection = {
      id: `col_${Date.now()}`,
      name,
      isPrivate: true,
      createdAt: new Date().toISOString(),
      items: [],
    };
    collectionsOf(accountId).unshift(collection);
    return summarise(accountId, collection);
  },

  'PATCH /api/collections/:id/': request => {
    const accountId = requireAccount(request);
    const collection = ownCollection(accountId, request.params.id);
    if (collection.follows) throw new MockError(403, NOT_HERS);
    if (request.body?.name !== undefined) {
      const name = String(request.body.name).trim();
      if (!name) throw new MockError(400, 'Name your collection');
      collection.name = name;
      collection.updatedAt = new Date().toISOString();
    }
    return summarise(accountId, collection);
  },

  'DELETE /api/collections/:id/': request => {
    const accountId = requireAccount(request);
    ownCollection(accountId, request.params.id);
    db.collections.set(
      accountId,
      collectionsOf(accountId).filter(collection => collection.id !== request.params.id)
    );
    return null;
  },

  'GET /api/collections/:id/items/': request => {
    const collection = ownCollection(requireAccount(request), request.params.id);
    return (sourceOf(collection, db.collections)?.source ?? collection).items;
  },

  'POST /api/collections/:id/items/': request => {
    const collection = ownCollection(requireAccount(request), request.params.id);
    if (collection.follows) throw new MockError(403, NOT_HERS);
    const kind = String(request.body?.kind ?? '');
    const refId = String(request.body?.refId ?? '');
    if (!refId || (kind !== 'look' && kind !== 'content')) {
      throw new MockError(400, 'Nothing to save');
    }
    const already = collection.items.find(item => item.kind === kind && item.refId === refId);
    if (already) return already;

    // A look is read from the feed. Content lives on the real API, so the app
    // sends what it already has on screen.
    const described =
      kind === 'look'
        ? describeItem(kind, refId)
        : {
            imageUri: request.body?.imageUri ? String(request.body.imageUri) : undefined,
            title: request.body?.title ? String(request.body.title) : undefined,
          };
    const item = {
      id: `ci_${Date.now()}`,
      kind,
      refId,
      addedAt: new Date().toISOString(),
      ...described,
    };
    collection.items.unshift(item);
    collection.updatedAt = item.addedAt;
    return item;
  },

  'DELETE /api/collections/:id/items/:itemId/': request => {
    const collection = ownCollection(requireAccount(request), request.params.id);
    if (collection.follows) throw new MockError(403, NOT_HERS);
    const index = collection.items.findIndex(item => item.id === request.params.itemId);
    if (index < 0) throw new MockError(404, 'That item is gone');
    collection.items.splice(index, 1);
    collection.updatedAt = new Date().toISOString();
    return null;
  },

  // ── Sharing a collection ──────────────────────────────────────────────────────

  'POST /api/collections/:id/share/': request => {
    const accountId = requireAccount(request);
    const collection = ownCollection(accountId, request.params.id);
    if (collection.follows) throw new MockError(403, 'Only its author can share it');
    collection.code ??= newCode();
    collection.sharedAt ??= new Date().toISOString();
    return summarise(accountId, collection);
  },

  'DELETE /api/collections/:id/share/': request => {
    const accountId = requireAccount(request);
    const collection = ownCollection(accountId, request.params.id);
    // The link stops working at once; sharing again makes a new one.
    collection.code = undefined;
    collection.sharedAt = undefined;
    collection.seedFollowers = undefined;
    return summarise(accountId, collection);
  },

  'GET /api/shared/collections/:code/': request => {
    const found = sharedCollection(request.params.code);
    if (!found) throw new MockError(404, NOT_SHARED);
    const { accountId, collection } = found;
    const viewer = request.accountId;
    return {
      code: collection.code,
      name: collection.name,
      author: author(accountId),
      itemCount: collection.items.length,
      updatedAt: collection.updatedAt ?? collection.createdAt,
      previewUris: collection.items
        .map(item => item.imageUri)
        .filter((uri): uri is string => !!uri)
        .slice(0, 4),
      items: collection.items,
      ownId: viewer === accountId ? collection.id : undefined,
      followingId: viewer
        ? collectionsOf(viewer).find(
            c => c.follows?.accountId === accountId && c.follows.id === collection.id
          )?.id
        : undefined,
    };
  },

  'POST /api/shared/collections/:code/follow/': request => {
    const viewer = requireAccount(request);
    const found = sharedCollection(request.params.code);
    if (!found) throw new MockError(404, NOT_SHARED);
    if (found.accountId === viewer) throw new MockError(400, 'It’s already yours');
    const already = collectionsOf(viewer).find(
      c => c.follows?.accountId === found.accountId && c.follows.id === found.collection.id
    );
    if (already) return summarise(viewer, already);
    const row: MockCollection = {
      id: `col_${Date.now()}`,
      name: '',
      isPrivate: true,
      createdAt: new Date().toISOString(),
      follows: { accountId: found.accountId, id: found.collection.id },
      items: [],
    };
    collectionsOf(viewer).unshift(row);
    return summarise(viewer, row);
  },

  // Reports go to moderation; the sample data just takes them.
  'POST /api/shared/collections/:code/report/': request => {
    requireAccount(request);
    if (!sharedCollection(request.params.code)) throw new MockError(404, NOT_SHARED);
    return null;
  },

  'POST /api/shared/care-plans/:code/report/': request => {
    requireAccount(request);
    if (!sharedPlan(request.params.code)) throw new MockError(404, NOT_SHARED);
    return null;
  },

  'POST /api/shared/collections/:code/make-mine/': request => {
    const viewer = requireAccount(request);
    const found = sharedCollection(request.params.code);
    if (!found) throw new MockError(404, NOT_SHARED);
    const copy = makeCollectionHers(
      viewer,
      found.collection,
      found.accountId,
      String(request.body?.name ?? '')
    );
    return summarise(viewer, copy);
  },

  'POST /api/collections/:id/make-mine/': request => {
    const viewer = requireAccount(request);
    const row = ownCollection(viewer, request.params.id);
    const followed = sourceOf(row, db.collections);
    if (!followed) throw new MockError(400, 'This one is already yours');
    // It takes the followed one's place: she stops following, and has her own instead.
    db.collections.set(
      viewer,
      collectionsOf(viewer).filter(c => c.id !== row.id)
    );
    const copy = makeCollectionHers(
      viewer,
      followed.source,
      followed.accountId,
      String(request.body?.name ?? '')
    );
    return summarise(viewer, copy);
  },

  // ── Care plans ────────────────────────────────────────────────────────────────

  'GET /api/care-plans/': request => {
    const accountId = requireAccount(request);
    return plansOf(accountId)
      .filter(p => stillThere(p, db.carePlans))
      .map(p => describePlanRow(accountId, p));
  },

  'POST /api/care-plans/': request => {
    const name = String(request.body?.name ?? '').trim();
    const steps = Array.isArray(request.body?.steps) ? request.body.steps : [];
    if (!name || !steps.length) throw new MockError(400, 'A plan needs a name and a step');
    const accountId = requireAccount(request);
    const plan: MockPlan = {
      id: `plan_${Date.now()}`,
      name,
      frequency: request.body?.frequency ?? 'weekly',
      specificDays: request.body?.specificDays,
      timeOfDay: request.body?.timeOfDay ?? 'evening',
      remindersOn: !!request.body?.remindersOn,
      steps: steps.map((text: string, index: number) => ({
        id: `step_${Date.now()}_${index}`,
        text: String(text),
      })),
      createdAt: new Date().toISOString(),
      sessions: [],
    };
    plansOf(accountId).unshift(plan);
    return describePlanRow(accountId, plan);
  },

  'PATCH /api/care-plans/:id/': request => {
    const accountId = requireAccount(request);
    const plan = ownPlan(accountId, request.params.id);
    const { steps, name, frequency, specificDays, timeOfDay, remindersOn } = request.body ?? {};
    // Her schedule is always hers to change, on a plan she follows too.
    if (frequency !== undefined) plan.frequency = frequency;
    if (specificDays !== undefined) plan.specificDays = specificDays;
    if (timeOfDay !== undefined) plan.timeOfDay = timeOfDay;
    if (remindersOn !== undefined) plan.remindersOn = !!remindersOn;
    // The name and steps only on her own.
    if (!plan.follows) {
      if (name !== undefined) plan.name = String(name);
      if (Array.isArray(steps)) {
        plan.steps = steps.map((text: string, index: number) => ({
          id: `step_${Date.now()}_${index}`,
          text: String(text),
        }));
      }
      plan.updatedAt = new Date().toISOString();
    }
    return describePlanRow(accountId, plan);
  },

  'DELETE /api/care-plans/:id/': request => {
    const accountId = requireAccount(request);
    db.carePlans.set(
      accountId,
      plansOf(accountId).filter(plan => plan.id !== request.params.id)
    );
    return null;
  },

  'GET /api/care-plans/:id/sessions/': request =>
    ownPlan(requireAccount(request), request.params.id).sessions,

  'POST /api/care-plans/:id/sessions/': request => {
    const plan = ownPlan(requireAccount(request), request.params.id);
    const session = {
      id: `sess_${Date.now()}`,
      completedAt: new Date().toISOString(),
      notes: request.body?.notes ? String(request.body.notes).trim() : undefined,
    };
    // Appended, never overwritten — and the plan's due date counts from the newest.
    plan.sessions.unshift(session);
    plan.lastDoneAt = session.completedAt;
    return session;
  },

  // ── Sharing a care plan ───────────────────────────────────────────────────────

  'POST /api/care-plans/:id/share/': request => {
    const accountId = requireAccount(request);
    const plan = ownPlan(accountId, request.params.id);
    if (plan.follows) throw new MockError(403, 'Only its author can share it');
    plan.code ??= newCode();
    plan.sharedAt ??= new Date().toISOString();
    return describePlanRow(accountId, plan);
  },

  'DELETE /api/care-plans/:id/share/': request => {
    const accountId = requireAccount(request);
    const plan = ownPlan(accountId, request.params.id);
    plan.code = undefined;
    plan.sharedAt = undefined;
    plan.seedFollowers = undefined;
    return describePlanRow(accountId, plan);
  },

  'GET /api/shared/care-plans/:code/': request => {
    const found = sharedPlan(request.params.code);
    if (!found) throw new MockError(404, NOT_SHARED);
    const { accountId, plan } = found;
    const viewer = request.accountId;
    return {
      code: plan.code,
      name: plan.name,
      author: author(accountId),
      frequency: plan.frequency,
      specificDays: plan.specificDays,
      timeOfDay: plan.timeOfDay,
      steps: plan.steps,
      updatedAt: plan.updatedAt ?? plan.createdAt,
      ownId: viewer === accountId ? plan.id : undefined,
      followingId: viewer
        ? plansOf(viewer).find(p => p.follows?.accountId === accountId && p.follows.id === plan.id)
            ?.id
        : undefined,
    };
  },

  'POST /api/shared/care-plans/:code/follow/': request => {
    const viewer = requireAccount(request);
    const found = sharedPlan(request.params.code);
    if (!found) throw new MockError(404, NOT_SHARED);
    if (found.accountId === viewer) throw new MockError(400, 'It’s already yours');
    const body = request.body ?? {};
    const row: MockPlan = {
      id: `plan_${Date.now()}`,
      name: '',
      frequency: body.frequency ?? found.plan.frequency,
      specificDays: body.specificDays,
      timeOfDay: body.timeOfDay ?? found.plan.timeOfDay,
      remindersOn: !!body.remindersOn,
      steps: [],
      createdAt: new Date().toISOString(),
      follows: { accountId: found.accountId, id: found.plan.id },
      sessions: [],
    };
    plansOf(viewer).unshift(row);
    return describePlanRow(viewer, row);
  },

  'POST /api/shared/care-plans/:code/make-mine/': request => {
    const viewer = requireAccount(request);
    const found = sharedPlan(request.params.code);
    if (!found) throw new MockError(404, NOT_SHARED);
    const plan = makePlanHers(
      viewer,
      found.plan,
      found.accountId,
      String(request.body?.name ?? '')
    );
    return describePlanRow(viewer, plan);
  },

  'POST /api/care-plans/:id/make-mine/': request => {
    const viewer = requireAccount(request);
    const row = ownPlan(viewer, request.params.id);
    const followed = sourceOf(row, db.carePlans);
    if (!followed) throw new MockError(400, 'This one is already yours');
    db.carePlans.set(
      viewer,
      plansOf(viewer).filter(p => p.id !== row.id)
    );
    // Her schedule and her history come with it.
    const plan = makePlanHers(
      viewer,
      followed.source,
      followed.accountId,
      String(request.body?.name ?? ''),
      row
    );
    return describePlanRow(viewer, plan);
  },
});
