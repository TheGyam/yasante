import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client';

/**
 * One cache for the site. Pages open on what's already known (inlined by the server,
 * or read a moment ago) while a fresh copy loads behind it.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        // A missing page stays missing; anything else gets two more tries.
        retry: (count, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });
}
