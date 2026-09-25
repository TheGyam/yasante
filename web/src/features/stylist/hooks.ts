import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStylistPage, searchStylists } from './api';
import type { StylistFilters } from './types';

/**
 * Query keys. `['stylist', handle]` (lower case) is also what the server inlines her
 * page under (backend/apps/web/views.py), so keep the two in step.
 */
export const stylistKeys = {
  page: (handle: string) => ['stylist', handle.toLowerCase()] as const,
  search: (filters: StylistFilters) => ['stylists', filters] as const,
};

export function useStylistPage(handle: string) {
  return useQuery({
    queryKey: stylistKeys.page(handle),
    queryFn: () => getStylistPage(handle),
  });
}

/** Start loading her page before the click lands. */
export function usePrefetchStylist() {
  const client = useQueryClient();
  return (handle: string) =>
    client.prefetchQuery({
      queryKey: stylistKeys.page(handle),
      queryFn: () => getStylistPage(handle),
    });
}

export function useStylistSearch(filters: StylistFilters) {
  return useQuery({
    queryKey: stylistKeys.search(filters),
    queryFn: () => searchStylists(filters),
    enabled: Object.values(filters).some(Boolean),
  });
}
