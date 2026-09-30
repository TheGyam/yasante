import { ApiError } from '@/shared/lib/api/client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router';
import { readStaff, writeStaff } from './api';
import type {
  Broadcasts,
  ErrorDetail,
  FormSchema,
  ErrorIssues,
  Insight,
  Overview,
  Related,
  ReviewQueue,
  SearchResults,
} from './types';

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
    /** Keep showing the last answer while the next loads (paging, filtering). */
    keepPrevious?: boolean;
  } = {}
) {
  const { keepPrevious, ...rest } = options;
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
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    ...rest,
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
        if (['review', 'undo', 'errors', 'broadcasts'].includes(category)) {
          // A decision moves a record between lists and changes every count.
          await Promise.all(
            [
              keys.overview,
              keys.family('review'),
              keys.family('errors'),
              keys.family('records'),
              keys.family('broadcasts'),
            ].map(queryKey => cache.invalidateQueries({ queryKey }))
          );
          return;
        }
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
  return useStaffRead<Overview>('overview/');
}

/** A record's form, shared by the panel, the full page and their headers. */
export function useRecordForm(app: string, model: string, id: string | undefined, search = '') {
  const path = `forms/${app}/${model}/${id ? `${encodeURIComponent(id)}/` : ''}${search}`;
  return { path, query: useStaffRead<FormSchema>(path, { refetchOnWindowFocus: false }) };
}

export const useSearch = (term: string) =>
  useStaffRead<SearchResults>(`search/?q=${encodeURIComponent(term)}`, {
    enabled: term.trim().length > 1,
  });

export const useReviewQueue = (queue: string) => useStaffRead<ReviewQueue>(`review/${queue}/`);

export const useRelated = (app: string, model: string, id: string) =>
  useStaffRead<Related>(`related/${app}/${model}/${encodeURIComponent(id)}/`);

export const useInsight = (name: string, range: string) =>
  useStaffRead<Insight>(`insights/${name}/?${range}`, { refetchOnWindowFocus: false });

export const useErrorIssues = (query: string) => useStaffRead<ErrorIssues>(`errors/?${query}`);

export const useBroadcasts = () => useStaffRead<Broadcasts>('broadcasts/');

export const useErrorIssue = (id: string) => useStaffRead<ErrorDetail>(`errors/${id}/`);

/**
 * Single-key and "g then x" shortcuts, ignored while someone types in a field. Handlers
 * are read from a ref, so the listener is added once.
 */
export function useShortcuts(bindings: Record<string, () => void>, enabled = true) {
  const latest = useRef(bindings);
  useEffect(() => {
    latest.current = bindings;
  });
  useEffect(() => {
    if (!enabled) return;
    let prefix = '';
    let timer = 0;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.closest('input, textarea, select, [contenteditable="true"]') ||
        document.querySelector('dialog[open]:not([data-shortcuts])')
      )
        return;
      const key = prefix ? `${prefix} ${event.key}` : event.key;
      if (latest.current[key]) {
        event.preventDefault();
        prefix = '';
        latest.current[key]();
      } else if (event.key === 'g') {
        prefix = 'g';
        window.clearTimeout(timer);
        timer = window.setTimeout(() => (prefix = ''), 900);
      } else prefix = '';
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/** A value kept in localStorage for this browser: a collapsed section, the theme. */
export function useLocalSetting<T extends string>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(`staff.${key}`) as T | null) ?? fallback;
    } catch {
      return fallback;
    }
  });
  const save = (next: T) => {
    setValue(next);
    try {
      localStorage.setItem(`staff.${key}`, next);
    } catch {
      // Private windows can refuse storage; the setting just won't persist.
    }
  };
  return [value, save] as const;
}
