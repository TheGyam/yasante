export type ProductCategory =
  | 'shampoo'
  | 'conditioner'
  | 'leave-in'
  | 'oil'
  | 'styler'
  | 'treatment';

/** A product in the catalogue. The catalogue is ours; the shelf is hers. */
export interface Product {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
}

/** Repurchase is the strongest quality signal there is, so it has its own state. */
export type ShelfStatus = 'using' | 'finished' | 'repurchased';

export interface ShelfItem {
  id: string;
  product: Product;
  status: ShelfStatus;
  /** 1–5, once she's rated it. Stored with her hair profile at the time. */
  rating?: number;
  /** How many she's got through, counting the first. */
  timesBought: number;
  startedAt: string;
  finishedAt?: string;
}
