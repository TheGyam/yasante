import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { plannerApi } from './api';
import type { CarePlanDraft, CollectionItemKind } from './types';

const KEY = 'planner';

/** Everything here is one person's own, so every key carries the account. */
function useKeys() {
  const { user } = useAuth();
  return {
    enabled: !!user?.id,
    collections: [KEY, 'collections', user?.id],
    items: (id: string) => [KEY, 'collection-items', user?.id, id],
    plans: [KEY, 'care-plans', user?.id],
    sessions: (id: string) => [KEY, 'care-plan-sessions', user?.id, id],
  };
}

export function useCollections() {
  const keys = useKeys();
  return useQuery({
    queryKey: keys.collections,
    queryFn: plannerApi.getCollections,
    enabled: keys.enabled,
    // Only her own saves and removals change these, and each refreshes them.
    staleTime: 10 * 60 * 1000,
  });
}

export function useCollectionItems(id: string) {
  const keys = useKeys();
  return useQuery({
    queryKey: keys.items(id),
    queryFn: () => plannerApi.getItems(id),
    enabled: keys.enabled && !!id,
    // Only her own saves and removals change these, and each refreshes them.
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Starts loading a collection's items as a finger lands on it, so they're usually
 * there by the time the page opens. Does nothing if a fresh copy is already cached.
 */
export function usePrefetchCollectionItems() {
  const queryClient = useQueryClient();
  const keys = useKeys();
  return (id: string) => {
    if (!keys.enabled) return;
    queryClient.prefetchQuery({
      queryKey: keys.items(id),
      queryFn: () => plannerApi.getItems(id),
      staleTime: 10 * 60 * 1000,
    });
  };
}

/** A write re-reads rather than patching the cache: counts and covers change too. */
function useRefreshCollections() {
  const queryClient = useQueryClient();
  const keys = useKeys();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: keys.collections });
    if (id) queryClient.invalidateQueries({ queryKey: keys.items(id) });
    // A look shows how many people saved it; the open one re-reads its count.
    queryClient.invalidateQueries({ queryKey: ['looks', 'one'] });
  };
}

export function useCreateCollection() {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: ({ name, isPrivate }: { name: string; isPrivate: boolean }) =>
      plannerApi.createCollection(name, isPrivate),
    onSuccess: () => refresh(),
  });
}

export function useUpdateCollection() {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string; name?: string; isPrivate?: boolean }) =>
      plannerApi.updateCollection(id, changes),
    onSuccess: collection => refresh(collection.id),
  });
}

export function useDeleteCollection() {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: (id: string) => plannerApi.deleteCollection(id),
    onSuccess: () => refresh(),
  });
}

export function useAddToCollection() {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: ({
      id,
      kind,
      refId,
      ...shown
    }: {
      id: string;
      kind: CollectionItemKind;
      refId: string;
      title?: string;
      imageUri?: string;
    }) => plannerApi.addItem(id, kind, refId, shown),
    onSuccess: (_item, { id }) => refresh(id),
  });
}

export function useRemoveFromCollection(collectionId: string) {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: (itemId: string) => plannerApi.removeItem(collectionId, itemId),
    onSuccess: () => refresh(collectionId),
  });
}

export function useCarePlans() {
  const keys = useKeys();
  return useQuery({
    queryKey: keys.plans,
    queryFn: plannerApi.getCarePlans,
    enabled: keys.enabled,
    staleTime: 60 * 1000,
  });
}

export function useCarePlanSessions(id: string) {
  const keys = useKeys();
  return useQuery({
    queryKey: keys.sessions(id),
    queryFn: () => plannerApi.getSessions(id),
    enabled: keys.enabled && !!id,
    staleTime: 60 * 1000,
  });
}

function useRefreshPlans() {
  const queryClient = useQueryClient();
  const keys = useKeys();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: keys.plans });
    if (id) queryClient.invalidateQueries({ queryKey: keys.sessions(id) });
  };
}

export function useCreateCarePlan() {
  const refresh = useRefreshPlans();
  return useMutation({
    mutationFn: (draft: CarePlanDraft) => plannerApi.createCarePlan(draft),
    onSuccess: () => refresh(),
  });
}

export function useUpdateCarePlan(id: string) {
  const refresh = useRefreshPlans();
  return useMutation({
    mutationFn: (draft: Partial<CarePlanDraft>) => plannerApi.updateCarePlan(id, draft),
    onSuccess: () => refresh(id),
  });
}

export function useDeleteCarePlan() {
  const refresh = useRefreshPlans();
  return useMutation({
    mutationFn: (id: string) => plannerApi.deleteCarePlan(id),
    onSuccess: () => refresh(),
  });
}

/** Marking it done is what moves the next due date. */
export function useLogCarePlanSession(id: string) {
  const refresh = useRefreshPlans();
  return useMutation({
    mutationFn: (notes?: string) => plannerApi.logSession(id, notes),
    onSuccess: () => refresh(id),
  });
}
