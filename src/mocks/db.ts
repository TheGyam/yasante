import type { User } from '@/features/profile';
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
        { id: 'men_cornrows', name: 'Cornrows', price: 45, fromPrice: false, durationMinutes: 120 },
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
      serviceName: 'Knotless braids',
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
      price: 55,
      fromPrice: false,
      createdAt: now,
    },
    {
      id: 'look_seed_3',
      authorId: 'acc_zainab',
      photoUri: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80',
      caption: 'Cornrows with a bit of colour.',
      createdAt: now,
    },
  ] as {
    id: string;
    authorId: string;
    photoUri: string;
    caption?: string;
    serviceName?: string;
    price?: number;
    fromPrice?: boolean;
    createdAt: string;
  }[],

  /** Who each account has blocked. Blocking is mutual. */
  blocks: new Map<string, Set<string>>(),

  /** Reports go to moderation. Nothing here reaches the person reported. */
  reports: [] as {
    lookId: string;
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
