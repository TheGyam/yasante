/* eslint-disable import/first, no-console -- a command-line tool: it prints, and __DEV__
   must be set before the mocks are imported. */
import fs from 'fs';
import path from 'path';

// Force __DEV__ since the mock configuration expects it.
(global as any).__DEV__ = true;

// Import the database and seed it.
import { db } from '../src/mocks/db';
import '../src/mocks/seed';
import { CATALOGUE } from '../src/mocks/shelf';

const dump = {
  accounts: Array.from(db.accounts.values()),
  stylists: Array.from(db.stylists.values()),
  menus: Array.from(db.menus.entries()).map(([k, v]) => ({ accountId: k, items: v })),
  looks: Array.from(db.looks),
  likes: Array.from(db.likes.entries()).map(([k, v]) => ({ lookId: k, userIds: Array.from(v) })),
  comments: Array.from(db.comments),
  commentLikes: Array.from(db.commentLikes.entries()).map(([k, v]) => ({
    commentId: k,
    userIds: Array.from(v),
  })),
  collections: Array.from(db.collections.entries()).map(([k, v]) => ({
    accountId: k,
    collections: v,
  })),
  carePlans: Array.from(db.carePlans.entries()).map(([k, v]) => ({ accountId: k, plans: v })),
  bookings: Array.from(db.bookings),
  slotInterests: Array.from(db.slotInterests),
  reviews: Array.from(db.reviews),
  checkIns: Array.from(db.checkIns),
  shelves: Array.from(db.shelves.entries()).map(([k, v]) => ({ accountId: k, items: v })),
  hairSnapshots: Array.from(db.hairSnapshots),
  consents: Array.from(db.consents),
  events: Array.from(db.events),
  exportRequests: Array.from(db.exportRequests),
  pageViews: Array.from(db.pageViews),
  blocks: Array.from(db.blocks.entries()).map(([k, v]) => ({
    blockerId: k,
    blockedIds: Array.from(v),
  })),
  reports: Array.from(db.reports),
  portfolios: Array.from(db.portfolios.entries()).map(([k, v]) => ({ accountId: k, photos: v })),
  invites: Array.from(db.invites.values()),
  products: CATALOGUE,
  styles: [
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
  ].map(([id, name]) => ({ id, name })),
};

fs.writeFileSync(path.join(__dirname, '..', 'backend', 'seed.json'), JSON.stringify(dump, null, 2));
console.log('Successfully dumped mock data to backend/seed.json');
