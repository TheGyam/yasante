import type { User } from '@/features/profile';
import type { StylistProfile } from '@/features/stylist';

/**
 * An in-memory stand-in for the backend, seeded with two accounts:
 *   client@yasante.dev — a client
 *   ama@yasante.dev    — a client who is also a stylist
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
        roles: ['client', 'stylist'],
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
        verificationTier: 1,
        createdAt: now,
      },
    ],
  ]),

  // Requests arrive with bookings; until then the inbox is honestly empty.
  pendingRequests: new Map<string, number>(),
};

export const findAccountByEmail = (email: string) =>
  [...db.accounts.values()].find(a => a.email.toLowerCase() === email.trim().toLowerCase());
