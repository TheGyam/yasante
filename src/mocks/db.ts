import type { HairTexture, User } from '@/features/profile';
import type { Booking, CheckInAnswers, CheckInWeek, Review } from '@/features/booking';
import type { ShelfItem } from '@/features/shelf';
import type { MenuItem, PortfolioPhoto, StylistProfile } from '@/features/stylist';

/**
 * An in-memory stand-in for the backend, seeded with two accounts:
 *   client@yasante.dev — a client
 *   ama@yasante.dev    — a client who is also a stylist
 *   new@yasante.dev    — signed up, phone not verified yet
 * Any password works. Everything resets when the app reloads.
 */

const now = new Date().toISOString();

export const db = {
  accounts: new Map<string, User & { email: string }>([
    [
      'acc_client',
      {
        id: 'acc_client',
        name: 'Efua Mensah',
        email: 'client@yasante.dev',
        phone: '+447700900111',
        phoneVerified: true,
        roles: ['client'],
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'acc_ama',
      {
        id: 'acc_ama',
        name: 'Ama Owusu',
        email: 'ama@yasante.dev',
        phone: '+447700900222',
        phoneVerified: true,
        roles: ['client', 'stylist'],
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'acc_zainab',
      {
        id: 'acc_zainab',
        name: 'Zainab Bello',
        email: 'zainab@yasante.dev',
        phone: '+447700900333',
        phoneVerified: true,
        roles: ['client', 'stylist'],
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'acc_new',
      {
        id: 'acc_new',
        name: 'Kojo Asante',
        email: 'new@yasante.dev',
        phoneVerified: false,
        roles: ['client'],
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]),

  stylists: new Map<string, StylistProfile>([
    [
      'acc_ama',
      {
        id: 'sty_ama',
        accountId: 'acc_ama',
        displayName: 'Braids by Ama',
        handle: 'braidsbyama',
        bio: 'Knotless, boho and feed-in braids. Gentle on edges, always.',
        serviceModels: ['home', 'mobile'],
        baseArea: 'Peckham',
        travelRadiusMiles: 5,
        instagramHandle: 'braidsbyama',
        policies: {
          noticeHours: 48,
          depositType: 'fixed' as const,
          depositAmount: 20,
          rescheduleFreeOnce: true,
        },
        verificationTier: 1,
        published: true,
        createdAt: now,
      },
    ],
    [
      'acc_zainab',
      {
        id: 'sty_zainab',
        accountId: 'acc_zainab',
        displayName: 'Zainab Does Hair',
        handle: 'zainabdoeshair',
        bio: 'Silk presses and cornrows. Heat-safe, always.',
        serviceModels: ['salon'],
        baseArea: 'Dalston',
        // Tuesday to Saturday, and away on Christmas Eve.
        availability: {
          week: [
            null,
            null,
            { start: '10:00', end: '19:00' },
            { start: '10:00', end: '19:00' },
            { start: '10:00', end: '19:00' },
            { start: '10:00', end: '19:00' },
            { start: '09:00', end: '17:00' },
          ],
          blocked: ['2026-12-24'],
        },
        policies: {
          noticeHours: 24,
          depositType: 'percent' as const,
          depositAmount: 20,
          rescheduleFreeOnce: true,
        },
        verificationTier: 1,
        published: true,
        createdAt: now,
      },
    ],
  ]),

  /** A stylist's menu, keyed by account. Ama has three services already. */
  menus: new Map<string, MenuItem[]>([
    [
      'acc_ama',
      [
        {
          id: 'men_knotless',
          name: 'Knotless braids',
          price: 120,
          fromPrice: true,
          durationMinutes: 300,
          note: 'Hair not included',
        },
        {
          id: 'men_cornrows',
          name: 'Cornrows',
          price: 45,
          fromPrice: true,
          durationMinutes: 120,
          options: [
            { id: 'cr_big', group: 'size' as const, label: 'Big', add: 0 },
            { id: 'cr_medium', group: 'size' as const, label: 'Medium', add: 15, addMinutes: 30 },
            { id: 'cr_small', group: 'size' as const, label: 'Small', add: 30, addMinutes: 60 },
          ],
        },
        {
          id: 'men_takedown',
          name: 'Take down and wash',
          price: 30,
          fromPrice: false,
          durationMinutes: 60,
        },
      ],
    ],
  ]),

  /**
   * Looks, newest first. Stored without the author's name or avatar — the feed
   * reads those from the account each time, the way a join would.
   */
  looks: [
    {
      id: 'look_seed_1',
      authorId: 'acc_ama',
      photoUri: 'https://images.unsplash.com/photo-1595959183082-7b570b7e08e2?w=800&q=80',
      caption: 'Knotless, waist length, done in one sitting.',
      serviceId: 'men_knotless',
      serviceName: 'Knotless braids',
      stylistId: 'acc_ama',
      styles: ['knotless'],
      hairTexture: 'coily' as const,
      price: 120,
      fromPrice: true,
      createdAt: now,
    },
    {
      id: 'look_seed_2',
      authorId: 'acc_zainab',
      photoUri: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80',
      caption: 'Silk press on 4c hair. No heat damage, ever.',
      serviceName: 'Silk press',
      stylistId: 'acc_zainab',
      styles: ['silk-press'],
      hairTexture: 'kinky' as const,
      price: 55,
      fromPrice: false,
      createdAt: now,
    },
    {
      id: 'look_seed_3',
      authorId: 'acc_zainab',
      photoUri: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80',
      caption: 'Cornrows with a bit of colour.',
      stylistId: 'acc_zainab',
      styles: ['cornrows'],
      hairTexture: 'coily' as const,
      createdAt: now,
    },
  ] as {
    id: string;
    authorId: string;
    photoUri: string;
    caption?: string;
    serviceId?: string;
    serviceName?: string;
    price?: number;
    fromPrice?: boolean;
    /** Who did the hair. The author, unless a client posted it. */
    stylistId?: string;
    styles: string[];
    hairTexture?: HairTexture;
    productIds?: string[];
    visibility?: 'public' | 'private';
    createdAt: string;
  }[],

  /** Who has liked each look. */
  likes: new Map<string, Set<string>>([
    ['look_seed_1', new Set(['acc_zainab', 'acc_client'])],
    ['look_seed_2', new Set(['acc_ama'])],
  ]),

  /**
   * Comments, oldest first. A reply points at the thread it's in (`parentId`,
   * always a top-level comment) and at the comment it answers (`replyToId`), which
   * may itself be a reply — one level of nesting, the way social apps show it.
   */
  comments: [
    {
      id: 'com_seed_1',
      lookId: 'look_seed_1',
      authorId: 'acc_zainab',
      body: 'The parts on this are so clean.',
      createdAt: now,
    },
  ] as {
    id: string;
    lookId: string;
    authorId: string;
    body: string;
    parentId?: string;
    replyToId?: string;
    createdAt: string;
  }[],

  /** A client's collections, with their items. Keyed by account. */
  collections: new Map<
    string,
    {
      id: string;
      name: string;
      isPrivate: boolean;
      createdAt: string;
      items: {
        id: string;
        kind: string;
        refId: string;
        imageUri?: string;
        title?: string;
        addedAt: string;
      }[];
    }[]
  >(),

  /** Care plans, with their sessions appended as they're logged. */
  carePlans: new Map<
    string,
    {
      id: string;
      name: string;
      frequency: string;
      specificDays?: number[];
      timeOfDay: string;
      remindersOn: boolean;
      steps: { id: string; text: string }[];
      lastDoneAt?: string;
      createdAt: string;
      sessions: { id: string; completedAt: string; notes?: string }[];
    }[]
  >(),

  /**
   * Bookings, newest first. The status field is the whole point: the app reflects
   * it and never sets it, so every transition is checked in one place.
   */
  bookings: [] as Booking[],

  /** Clients waiting for a slot with a stylist on any day in a range. */
  slotInterests: [] as {
    id: string;
    clientId: string;
    stylistId: string;
    from: string;
    to: string;
    openedOn?: string;
    createdAt: string;
  }[],

  /** Reviews, one per completed booking. They start pending and go through moderation. */
  reviews: [] as (Review & { stylistId: string; clientId: string })[],

  /** Week 2 and week 4 check-ins, as answered. */
  checkIns: [] as (CheckInAnswers & {
    bookingId: string;
    accountId: string;
    week: CheckInWeek;
    at: string;
  })[],

  /** Each account's product shelf. The catalogue itself lives in ./shelf. */
  shelves: new Map<string, ShelfItem[]>(),

  /** Every hair profile change, appended. Nothing is overwritten in place. */
  hairSnapshots: [] as { accountId: string; profile: unknown; at: string }[],

  /** Consent records as the app sent them: a history, not a switch. */
  consents: [] as {
    accountId: string;
    purpose: string;
    granted: boolean;
    policyVersion: string;
    recordedAt: string;
    source?: string;
  }[],

  /** Analytics events. Only ever sent with the analytics consent. */
  events: [] as {
    accountId?: string;
    anonymousId?: string;
    name: string;
    at: string;
    localAt: string;
  }[],

  /** Data export requests, fulfilled by email. */
  exportRequests: [] as { accountId: string; at: string }[],

  /** Page views, counted by the server on every visit that isn't her own. */
  pageViews: [] as { stylistId: string; at: string }[],

  /** Who each account has blocked. Blocking is mutual. */
  blocks: new Map<string, Set<string>>(),

  /** Reports go to moderation. Nothing here reaches the person reported. */
  reports: [] as {
    lookId?: string;
    reviewId?: string;
    commentId?: string;
    profileId?: string;
    reason: string;
    note?: string;
    reportedBy: string;
    at: string;
  }[],

  /** Portfolio photos, keyed by account. Empty until someone imports some. */
  portfolios: new Map<string, PortfolioPhoto[]>(),

  /** Stylist invites. FOUNDING50 always works; USED1 has been redeemed. */
  invites: new Map([
    [
      'FOUNDING50',
      {
        code: 'FOUNDING50',
        role: 'stylist' as const,
        invitedBy: 'Akua from Yasante',
        redeemedBy: null as string | null,
      },
    ],
    [
      'USED1',
      {
        code: 'USED1',
        role: 'stylist' as const,
        invitedBy: 'Akua from Yasante',
        redeemedBy: 'acc_ama' as string | null,
      },
    ],
  ]),

  /** Pending phone codes. In dev the code is always 123456. */
  phoneCodes: new Map<string, { code: string; sentAt: number; attempts: number }>(),

  // Requests arrive with bookings; until then the inbox is honestly empty.
  pendingRequests: new Map<string, number>(),
};

export const findAccountByEmail = (email: string) =>
  [...db.accounts.values()].find(a => a.email.toLowerCase() === email.trim().toLowerCase());

/**
 * Two finished appointments with Ama, so reviews and check-ins have something to
 * hang off: Efua's from a fortnight ago (her week-2 check-in is due and she hasn't
 * reviewed it), and Zainab's, reviewed and through moderation.
 */
function seedCompleted(id: string, clientId: string, daysAgo: number): Booking {
  const at = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  const ama = db.stylists.get('acc_ama')!;
  return {
    id,
    status: 'completed',
    clientId,
    clientName: db.accounts.get(clientId)!.name,
    stylistId: 'acc_ama',
    stylistName: ama.displayName,
    stylistHandle: ama.handle,
    serviceId: 'men_knotless',
    serviceName: 'Knotless braids',
    price: 120,
    fromPrice: true,
    durationMinutes: 300,
    bringingOwnHair: false,
    requestedTimes: [at],
    scheduledFor: at,
    area: ama.baseArea,
    address: `12 Bellenden Road, ${ama.baseArea}`,
    policy: ama.policies,
    policyVersion: 'seed',
    moves: 0,
    completedAt: at,
    createdAt: at,
    updatedAt: at,
  };
}

db.bookings.push(
  seedCompleted('bk_seed_efua', 'acc_client', 15),
  seedCompleted('bk_seed_zainab', 'acc_zainab', 40)
);
db.reviews.push({
  id: 'rev_seed_zainab',
  bookingId: 'bk_seed_zainab',
  stylistId: 'acc_ama',
  clientId: 'acc_zainab',
  rating: 5,
  body: 'Neat parts, no tension on my edges, and done when she said it would be.',
  status: 'published',
  authorName: 'Zainab',
  serviceName: 'Knotless braids',
  createdAt: new Date(Date.now() - 38 * 86_400_000).toISOString(),
});
