import type { Product, ShelfItem, ShelfStatus } from '@/features/shelf';
import { defineMocks, MockError, requireAccount } from '@/shared/lib/api/mock';
import { db } from './db';

/** A starter catalogue of what's actually on shelves in UK Afro hair aisles. */
export const CATALOGUE: Product[] = [
  ['Cantu', 'Shea Butter Leave-In Conditioning Repair Cream', 'leave-in'],
  ['Cantu', 'Coconut Curling Cream', 'styler'],
  ['Cantu', 'Sulfate-Free Cleansing Cream Shampoo', 'shampoo'],
  ['SheaMoisture', 'Coconut & Hibiscus Curl Enhancing Smoothie', 'styler'],
  ['SheaMoisture', 'Jamaican Black Castor Oil Strengthen & Restore Leave-In', 'leave-in'],
  ['SheaMoisture', 'Manuka Honey & Mafura Oil Intensive Hydration Masque', 'treatment'],
  ['Mielle', 'Rosemary Mint Scalp & Hair Strengthening Oil', 'oil'],
  ['Mielle', 'Pomegranate & Honey Leave-In Conditioner', 'leave-in'],
  ['Camille Rose', 'Curl Maker', 'styler'],
  ['As I Am', 'Coconut CoWash Cleansing Conditioner', 'conditioner'],
  ['As I Am', 'Double Butter Rich Daily Moisturizer', 'leave-in'],
  ['Aunt Jackie’s', 'Don’t Shrink Flaxseed Elongating Curl Gel', 'styler'],
  ['TGIN', 'Honey Miracle Hair Mask', 'treatment'],
  ['Eco Style', 'Olive Oil Styling Gel', 'styler'],
  ['Palmer’s', 'Coconut Oil Formula Moisture Boost Curl Cream', 'styler'],
  ['Design Essentials', 'Almond & Avocado Detangling Leave-In Conditioner', 'leave-in'],
  ['Bread Beauty Supply', 'Hair-Wash Gentle Milk Cleanser', 'shampoo'],
  ['Bread Beauty Supply', 'Hair-Oil Everyday Gloss', 'oil'],
  ['Pattern', 'Leave-In Conditioner', 'leave-in'],
  ['Pattern', 'Intensive Conditioner', 'conditioner'],
  ['Kinky-Curly', 'Knot Today Leave-In Detangler', 'leave-in'],
  ['Jamaican Mango & Lime', 'Black Castor Oil', 'oil'],
  ['ORS', 'Olive Oil Edge Control', 'styler'],
  ['Aphogee', 'Two-Step Protein Treatment', 'treatment'],
].map(([brand, name, category], i) => ({
  id: `prd_${i + 1}`,
  brand,
  name,
  category: category as Product['category'],
}));

const shelfOf = (accountId: string) => {
  if (!db.shelves.has(accountId)) db.shelves.set(accountId, []);
  return db.shelves.get(accountId)!;
};

const product = (id: string) => CATALOGUE.find(p => p.id === id);
export const productById = product;

/** Her hair at the moment she rated, so a rating can later be read against hair like hers. */
const ratedWith = new Map<string, { rating: number; hair: unknown; at: string }[]>();

// Efua has two things on the go and one she's been through twice.
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
db.shelves.set('acc_client', [
  {
    id: 'shf_seed_1',
    product: product('prd_1')!,
    status: 'repurchased',
    rating: 4,
    timesBought: 2,
    startedAt: daysAgo(70),
  },
  {
    id: 'shf_seed_2',
    product: product('prd_7')!,
    status: 'using',
    timesBought: 1,
    startedAt: daysAgo(12),
  },
]);

defineMocks({
  'GET /api/products/': ({ query }) => {
    const words = (query.get('q') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    const limit = Math.min(Number(query.get('limit')) || 30, 50);
    return CATALOGUE.filter(p => {
      const text = `${p.brand} ${p.name} ${p.category}`.toLowerCase();
      return words.every(word => text.includes(word));
    }).slice(0, limit);
  },

  'POST /api/products/': request => {
    requireAccount(request);
    const { brand, name, category } = request.body ?? {};
    const same = CATALOGUE.find(
      p =>
        p.brand.toLowerCase() === String(brand).toLowerCase() &&
        p.name.toLowerCase() === String(name).toLowerCase()
    );
    if (same) return same;
    const product: Product = { id: `prd_own_${Date.now()}`, brand, name, category, pending: true };
    CATALOGUE.push(product);
    return product;
  },

  // Any barcode ending in 0 is unknown; the rest map onto the catalogue.
  'GET /api/products/barcode/:code/': request => {
    const code = String(request.params.code).replace(/\D/g, '');
    if (code.length < 8)
      throw new MockError(400, 'That barcode didn’t scan properly. Try again, a little closer.');
    if (code.endsWith('0'))
      throw new MockError(404, 'We don’t know that one yet. Search for it by name instead.');
    return { product: CATALOGUE[Number(code.slice(-2)) % CATALOGUE.length], source: 'catalogue' };
  },

  'GET /api/shelf/': request =>
    [...shelfOf(requireAccount(request))].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),

  'POST /api/shelf/': request => {
    const shelf = shelfOf(requireAccount(request));
    const found = product(String(request.body?.productId ?? ''));
    if (!found) throw new MockError(404, 'That product isn’t in the catalogue');
    if (shelf.some(item => item.product.id === found.id)) {
      throw new MockError(409, 'It’s already on your shelf');
    }
    const item: ShelfItem = {
      id: `shf_${Date.now()}`,
      product: found,
      status: 'using',
      timesBought: 1,
      startedAt: new Date().toISOString(),
    };
    shelf.push(item);
    return item;
  },

  'PATCH /api/shelf/:id/': request => {
    const accountId = requireAccount(request);
    const item = shelfOf(accountId).find(i => i.id === request.params.id);
    if (!item) throw new MockError(404, 'That’s not on your shelf');

    if (request.body?.rating !== undefined) {
      const rating = Number(request.body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new MockError(400, 'Between one and five stars');
      }
      item.rating = rating;
      const history = ratedWith.get(item.product.id) ?? [];
      history.push({
        rating,
        hair: db.accounts.get(accountId)?.hairProfile,
        at: new Date().toISOString(),
      });
      ratedWith.set(item.product.id, history);
    }

    const status = request.body?.status as ShelfStatus | undefined;
    if (status === 'finished' && item.status !== 'finished') {
      item.status = 'finished';
      item.finishedAt = new Date().toISOString();
    } else if (status === 'repurchased' && item.status === 'finished') {
      // Back in use, and counted — the strongest signal a product gets.
      item.status = 'repurchased';
      item.timesBought += 1;
      item.finishedAt = undefined;
    } else if (status && status !== item.status) {
      throw new MockError(409, `Can’t go from ${item.status} to ${status}`);
    }
    return item;
  },

  'DELETE /api/shelf/:id/': request => {
    const shelf = shelfOf(requireAccount(request));
    const index = shelf.findIndex(i => i.id === request.params.id);
    if (index < 0) throw new MockError(404, 'That’s not on your shelf');
    shelf.splice(index, 1);
    return null;
  },
});
