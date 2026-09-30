import { ApiError } from '@/shared/lib/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router';
import { readStaff, writeStaff } from './api';

export const keys = {
  session: ['staff', 'session'] as const,
  overview: ['staff', 'overview'] as const,
  metrics: ['staff', 'metrics'] as const,
  family: (kind: string) => ['staff', kind] as const,
  read: (path: string) => ['staff', ...path.split('/').filter(Boolean)] as const,
  model: (kind: string, app: string, model: string) => ['staff', kind, app, model] as const,
};

export function useStaffRead<T>(
  path: string,
  options: {
    enabled?: boolean;
    retry?: false;
    refetchOnWindowFocus?: false;
    refetchInterval?: number;
  } = {}
) {
  const cache = useQueryClient();
  return useQuery({
    queryKey: keys.read(path),
    queryFn: async ({ signal }) => {
      try {
        return await readStaff<T>(path, signal);
      } catch (error) {
        if (
          path !== 'session/' &&
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        )
          await cache.invalidateQueries({ queryKey: keys.session });
        throw error;
      }
    },
    ...options,
  });
}

export function useStaffMutation() {
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ path, body, csrf }: { path: string; body: FormData; csrf: string }) =>
      writeStaff<unknown>(path, body, csrf),
    onSuccess: async (data, { path }) => {
      const category = path.split('/')[0];
      if (category === 'session') {
        cache.removeQueries({
          predicate: query => query.queryKey[0] === 'staff' && query.queryKey[1] !== 'session',
        });
        await cache.invalidateQueries({ queryKey: keys.session });
      } else if (path.startsWith('two-factor/reset/')) {
        await Promise.all(
          [keys.session, keys.overview].map(queryKey => cache.invalidateQueries({ queryKey }))
        );
      } else if (
        category !== 'two-factor' &&
        data &&
        typeof data === 'object' &&
        (('saved' in data && data.saved) ||
          ('deleted' in data && data.deleted) ||
          ('done' in data && data.done))
      ) {
        const [, app, model] = path.split('/');
        const affected: (readonly string[])[] = [
          keys.overview,
          keys.metrics,
          keys.family('choices'),
        ];
        for (const kind of ['records', 'forms', 'history', 'quick-edit', 'password']) {
          // Delete cascades and custom admin actions may affect other model lists.
          affected.push(
            app && model && category !== 'delete' && category !== 'actions'
              ? keys.model(kind, app, model)
              : keys.family(kind)
          );
        }
        await Promise.all(affected.map(queryKey => cache.invalidateQueries({ queryKey })));
      }
    },
  });
  return async function mutateStaff<T>(path: string, body: FormData, csrf: string): Promise<T> {
    return (await mutation.mutateAsync({ path, body, csrf })) as T;
  };
}

export function useFinishVerification() {
  const cache = useQueryClient();
  return () => cache.invalidateQueries({ queryKey: keys.session });
}

export function useDraftGuard() {
  const dirty = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty.current &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search)
  );
  useBeforeUnload(event => {
    if (dirty.current) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  return {
    setDirty: (value = true) => {
      dirty.current = value;
    },
    blocker,
  };
}

export const staffMessage = (error: unknown) =>
  error instanceof ApiError && typeof error.data?.message === 'string'
    ? error.data.message
    : 'The request did not finish. Reload before repeating it to check whether it was saved.';

export function useOverviewRefresh() {
  return useStaffRead<import('./types').Overview>('overview/');
}
