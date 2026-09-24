import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

function collectionsOf(accountId: string) {
  const collections = db.collections.get(accountId) ?? [];
  db.collections.set(accountId, collections);
  return collections;
}

function ownCollection(accountId: string, id: string) {
  const found = collectionsOf(accountId).find(collection => collection.id === id);
  if (!found) throw new MockError(404, 'That collection is gone');
  return found;
}

function plansOf(accountId: string) {
  const plans = db.carePlans.get(accountId) ?? [];
  db.carePlans.set(accountId, plans);
  return plans;
}

/** The card needs a count and a picture; the server would compute both. */
const summarise = (collection: {
  id: string;
  name: string;
  isPrivate: boolean;
  createdAt: string;
  items: { imageUri?: string }[];
}) => ({
  id: collection.id,
  name: collection.name,
  isPrivate: collection.isPrivate,
  createdAt: collection.createdAt,
  itemCount: collection.items.length,
  coverUri: collection.items.find(item => item.imageUri)?.imageUri,
  previewUris: collection.items
    .map(item => item.imageUri)
    .filter((uri): uri is string => !!uri)
    .slice(0, 4),
});

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

defineMocks({
  'GET /api/collections/': request => collectionsOf(requireAccount(request)).map(summarise),

  'POST /api/collections/': request => {
    const name = String(request.body?.name ?? '').trim();
    if (!name) throw new MockError(400, 'Name your collection');
    const collection = {
      id: `col_${Date.now()}`,
      name,
      isPrivate: request.body?.isPrivate !== false,
      createdAt: new Date().toISOString(),
      items: [] as {
        id: string;
        kind: string;
        refId: string;
        imageUri?: string;
        title?: string;
        addedAt: string;
      }[],
    };
    collectionsOf(requireAccount(request)).unshift(collection);
    return summarise(collection);
  },

  'PATCH /api/collections/:id/': request => {
    const collection = ownCollection(requireAccount(request), request.params.id);
    if (request.body?.name !== undefined) {
      const name = String(request.body.name).trim();
      if (!name) throw new MockError(400, 'Name your collection');
      collection.name = name;
    }
    if (request.body?.isPrivate !== undefined) collection.isPrivate = !!request.body.isPrivate;
    return summarise(collection);
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

  'GET /api/collections/:id/items/': request =>
    ownCollection(requireAccount(request), request.params.id).items,

  'POST /api/collections/:id/items/': request => {
    const collection = ownCollection(requireAccount(request), request.params.id);
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
    return item;
  },

  'DELETE /api/collections/:id/items/:itemId/': request => {
    const collection = ownCollection(requireAccount(request), request.params.id);
    const index = collection.items.findIndex(item => item.id === request.params.itemId);
    if (index < 0) throw new MockError(404, 'That item is gone');
    collection.items.splice(index, 1);
    return null;
  },

  'GET /api/care-plans/': request => plansOf(requireAccount(request)),

  'POST /api/care-plans/': request => {
    const name = String(request.body?.name ?? '').trim();
    const steps = Array.isArray(request.body?.steps) ? request.body.steps : [];
    if (!name || !steps.length) throw new MockError(400, 'A plan needs a name and a step');
    const plan = {
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
      lastDoneAt: undefined as string | undefined,
      createdAt: new Date().toISOString(),
      sessions: [] as { id: string; completedAt: string; notes?: string }[],
    };
    plansOf(requireAccount(request)).unshift(plan);
    return plan;
  },

  'PATCH /api/care-plans/:id/': request => {
    const plan = plansOf(requireAccount(request)).find(item => item.id === request.params.id);
    if (!plan) throw new MockError(404, 'That plan is gone');
    const { steps, ...rest } = request.body ?? {};
    Object.assign(plan, rest);
    if (Array.isArray(steps)) {
      plan.steps = steps.map((text: string, index: number) => ({
        id: `step_${Date.now()}_${index}`,
        text: String(text),
      }));
    }
    return plan;
  },

  'DELETE /api/care-plans/:id/': request => {
    const accountId = requireAccount(request);
    db.carePlans.set(
      accountId,
      plansOf(accountId).filter(plan => plan.id !== request.params.id)
    );
    return null;
  },

  'GET /api/care-plans/:id/sessions/': request => {
    const plan = plansOf(requireAccount(request)).find(item => item.id === request.params.id);
    if (!plan) throw new MockError(404, 'That plan is gone');
    return plan.sessions;
  },

  'POST /api/care-plans/:id/sessions/': request => {
    const plan = plansOf(requireAccount(request)).find(item => item.id === request.params.id);
    if (!plan) throw new MockError(404, 'That plan is gone');
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
});
