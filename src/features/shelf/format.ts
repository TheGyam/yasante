import type { ProductCategory, ShelfItem } from './types';
import { SEP } from '@/shared/lib/format';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  shampoo: 'Shampoo',
  conditioner: 'Conditioner',
  'leave-in': 'Leave-in',
  oil: 'Oil',
  styler: 'Styler',
  treatment: 'Treatment',
};

export const isInUse = (item: Pick<ShelfItem, 'status'>) => item.status !== 'finished';

/** "3 in use · 2 finished · 1 bought again" — only the parts that are true. */
export function shelfSummary(items: ShelfItem[]) {
  const using = items.filter(isInUse).length;
  const finished = items.filter(i => i.timesBought > 1 || i.status === 'finished').length;
  const again = items.filter(i => i.timesBought > 1).length;
  return [
    using && `${using} in use`,
    finished && `${finished} finished`,
    again && `${again} bought again`,
  ]
    .filter(Boolean)
    .join(SEP);
}
