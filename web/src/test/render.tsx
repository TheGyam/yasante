import { render } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { makeQueryClient } from '@/shared/lib/queryClient';
import { routes } from '@/routes';

interface Call {
  method: string;
  url: string;
  body?: unknown;
  auth?: string;
  csrf?: string;
}

type Answer = unknown | { status: number; body?: unknown };
/** A fixed answer, or one worked out from the request. */
type Handler = Answer | ((call: Call) => Answer);

/**
 * Answer /api calls from a table. Keys are a path ("/api/looks/") or a method and a
 * path ("POST /api/auth/signup/"); the method-specific one wins.
 */
export function mockApi(table: Record<string, Handler>) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const raw = init?.body;
    const call: Call = {
      method,
      url,
      body: typeof raw === 'string' ? JSON.parse(raw) : raw,
      auth: (init?.headers as Record<string, string> | undefined)?.Authorization,
      csrf: (init?.headers as Record<string, string> | undefined)?.['X-CSRFToken'],
    };
    calls.push(call);
    const path = url.split('?')[0];
    const handler = table[`${method} ${path}`] ?? table[path];
    const answer =
      handler === undefined
        ? { status: 404, body: { message: 'Not found' } }
        : typeof handler === 'function'
          ? (handler as (call: Call) => Answer)(call)
          : handler;
    const { status = 200, body = answer } =
      // { status: 404, body } is a reply; a booking's own `status: 'requested'` is data.
      answer &&
      typeof answer === 'object' &&
      typeof (answer as { status?: unknown }).status === 'number'
        ? (answer as { status: number; body?: unknown })
        : { body: answer };
    return new Response(body === undefined ? '' : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return calls;
}

/** The whole site at one address, as a visitor would open it. */
export function renderSite(path: string, client: QueryClient = makeQueryClient()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    client,
    router,
    ...render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ),
  };
}
