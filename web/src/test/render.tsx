import { render } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { makeQueryClient } from '@/shared/lib/queryClient';
import { routes } from '@/routes';

/** Answer /api calls from a table of path → JSON (or a status for failures). */
export function mockApi(table: Record<string, unknown>) {
  const calls: { url: string; body?: unknown }[] = [];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const path = url.split('?')[0];
    const answer = table[path] ?? { status: 404, body: { message: 'Not found' } };
    const { status = 200, body = answer } =
      answer && typeof answer === 'object' && 'status' in answer
        ? (answer as { status: number; body?: unknown })
        : { body: answer };
    return new Response(body === undefined ? '' : JSON.stringify(body), { status });
  });
  return calls;
}

/** The whole site at one address, as a visitor would open it. */
export function renderSite(path: string, client: QueryClient = makeQueryClient()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ),
  };
}
