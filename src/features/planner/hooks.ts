import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { plannerApi } from './api';
import { syncReminders } from './reminders';
import type { CarePlanDraft, CarePlanSchedule, CollectionItemKind, Sharing } from './types';

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
    // Keyed by account too: what she sees of it (hers, following) depends on who she is.
    shared: (kind: 'collection' | 'care-plan', code: string) => [
      KEY,
      'shared',
      kind,
      user?.id,
      code,
    ],
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
    mutationFn: (name: string) => plannerApi.createCollection(name),
    onSuccess: () => refresh(),
  });
}

export function useUpdateCollection() {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string; name?: string }) =>
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

// ── Sharing ─────────────────────────────────────────────────────────────────────

/** Share by link, or stop sharing. */
export function useShareCollection(id: string) {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: (sharing: Sharing) => plannerApi.shareCollection(id, sharing),
    onSuccess: () => refresh(id),
  });
}

export function useShareCarePlan(id: string) {
  const refresh = useRefreshPlans();
  return useMutation({
    mutationFn: (sharing: Sharing) => plannerApi.shareCarePlan(id, sharing),
    onSuccess: () => refresh(id),
  });
}

/** Someone's shared collection, as its link shows it. Anyone can look; signed out too. */
export function useSharedCollection(code: string) {
  const keys = useKeys();
  return useQuery({
    queryKey: keys.shared('collection', code),
    queryFn: () => plannerApi.getSharedCollection(code),
    enabled: !!code,
    staleTime: 60 * 1000,
    // Gone (stopped, deleted, blocked) is an answer: asking again won't change it.
    retry: (count, error) =>
      (error as { response?: { status?: number } })?.response?.status !== 404 && count < 2,
  });
}

export function useSharedCarePlan(code: string) {
  const keys = useKeys();
  return useQuery({
    queryKey: keys.shared('care-plan', code),
    queryFn: () => plannerApi.getSharedCarePlan(code),
    enabled: !!code,
    staleTime: 60 * 1000,
    retry: (count, error) =>
      (error as { response?: { status?: number } })?.response?.status !== 404 && count < 2,
  });
}

/** Following and making it hers change her Planner and what the link shows her. */
function useRefreshShared() {
  const queryClient = useQueryClient();
  const collections = useRefreshCollections();
  const plans = useRefreshPlans();
  return () => {
    collections();
    plans();
    queryClient.invalidateQueries({ queryKey: [KEY, 'shared'] });
  };
}

export function useFollowCollection() {
  const refresh = useRefreshShared();
  return useMutation({
    mutationFn: (code: string) => plannerApi.followCollection(code),
    onSuccess: () => refresh(),
  });
}

export function useFollowCarePlan() {
  const refresh = useRefreshShared();
  return useMutation({
    mutationFn: ({ code, schedule }: { code: string; schedule: CarePlanSchedule }) =>
      plannerApi.followCarePlan(code, schedule),
    onSuccess: () => refresh(),
  });
}

/** Unfollowing removes it from her Planner; the author's own is untouched. */
export function useUnfollow(kind: 'collection' | 'care-plan') {
  const refresh = useRefreshShared();
  return useMutation({
    mutationFn: (id: string) =>
      kind === 'collection' ? plannerApi.deleteCollection(id) : plannerApi.deleteCarePlan(id),
    onSuccess: () => refresh(),
  });
}

export function useMakeCollectionMine() {
  const refresh = useRefreshShared();
  return useMutation({
    mutationFn: ({ from, name }: { from: { code?: string; id?: string }; name: string }) =>
      plannerApi.makeCollectionMine(from, name),
    onSuccess: () => refresh(),
  });
}

export function useMakeCarePlanMine() {
  const refresh = useRefreshShared();
  return useMutation({
    mutationFn: ({ from, name }: { from: { code?: string; id?: string }; name: string }) =>
      plannerApi.makeCarePlanMine(from, name),
    onSuccess: () => refresh(),
  });
}

/**
 * Keeps this phone's care plan reminders in step with her plans: whenever they change,
 * whenever the app comes back to the front, and cleared when she signs out.
 */
export function useCarePlanReminders() {
  const { user } = useAuth();
  const { data } = useCarePlans();
  const plans = user?.id ? data : undefined;
  // Only what the reminders depend on, so a refetch with nothing new does nothing.
  const wanted = JSON.stringify(
    (plans ?? []).map(p => [
      p.id,
      p.name,
      p.frequency,
      p.specificDays,
      p.timeOfDay,
      p.remindersOn,
      p.lastDoneAt,
    ])
  );
  const latest = useRef(plans);
  latest.current = plans;
  useEffect(() => {
    if (!user?.id) syncReminders([]);
    else if (plans) syncReminders(plans);
    // `wanted` stands for the plans.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, wanted]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      // A new day: the next two weeks start from today.
      if (state === 'active' && latest.current) syncReminders(latest.current);
    });
    return () => listener.remove();
  }, []);
}
