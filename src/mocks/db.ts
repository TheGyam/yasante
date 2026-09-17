import type { User } from '@/features/profile';
import type { StylistProfile } from '@/features/stylist';

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
        verificationTier: 1,
        createdAt: now,
      },
    ],
  ]),

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
