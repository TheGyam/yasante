import { apiClient } from '@/shared/lib/api/client';
import type { Product, ShelfItem, ShelfStatus } from './types';

export const shelfApi = {
  /** GET /api/products/?q= — the catalogue, a page at a time. */
  search: async (q: string) =>
    (await apiClient.get<Product[]>('/api/products/', { params: { q, limit: 30 } })).data,

  /** GET /api/shelf/ — hers, most recently started first. */
  list: async () => (await apiClient.get<ShelfItem[]>('/api/shelf/')).data,

  /** POST /api/shelf/ — she's started using it. */
  add: async (productId: string) =>
    (await apiClient.post<ShelfItem>('/api/shelf/', { productId })).data,

  /** PATCH /api/shelf/:id/ — a rating, or finishing it, or buying it again. The server keeps the dates. */
  update: async (id: string, patch: { rating?: number; status?: ShelfStatus }) =>
    (await apiClient.patch<ShelfItem>(`/api/shelf/${id}/`, patch)).data,

  /** DELETE /api/shelf/:id/ */
  remove: async (id: string) => {
    await apiClient.delete(`/api/shelf/${id}/`);
  },
};
