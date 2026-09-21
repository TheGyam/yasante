import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { shelfApi } from './api';
import type { ShelfStatus } from './types';
import { track } from '@/shared/lib/analytics';

const KEY = 'shelf';

export function useShelf() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEY, user?.id],
    queryFn: shelfApi.list,
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
}

/** The catalogue, searched as she types. The last results stay up while the next load. */
export function useProductSearch(q: string) {
  return useQuery({
    queryKey: ['products', q.trim().toLowerCase()],
    queryFn: () => shelfApi.search(q.trim()),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useAddToShelf() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (productId: string) => shelfApi.add(productId),
    onSuccess: item => {
      track('add_shelf_item', { productId: item.product.id, category: item.product.category });
      return onSuccess();
    },
  });
}

export function useUpdateShelfItem() {
  const onSuccess = useRefresh();
  return useMutation({
    mutationFn: (args: { id: string; rating?: number; status?: ShelfStatus }) =>
      shelfApi.update(args.id, { rating: args.rating, status: args.status }),
    onSuccess,
  });
}

export function useRemoveFromShelf() {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: (id: string) => shelfApi.remove(id), onSuccess });
}
