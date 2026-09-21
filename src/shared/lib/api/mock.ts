import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Schema-first mocks: the app talks to the same URLs the backend will serve, and a
 * feature's mocks switch off by deleting its handlers once the real endpoint lands.
 * Requests nothing matches go to the network untouched.
 *
 * Dev only, and only when EXPO_PUBLIC_API_MOCKS=true.
 */

export interface MockRequest {
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
  /** The signed-in account, read from the mock bearer token. */
  accountId?: string;
}

export type MockHandler = (request: MockRequest) => unknown;

export class MockError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: MockHandler;
}

const routes: Route[] = [];
// A quick real API on a good connection: loading states still show, but a dev build
// isn't left waiting on a made-up network before every screen.
const LATENCY_MS = 90;

/** Tokens the mock auth hands out carry the account id, so handlers know who's asking. */
export const mockToken = (accountId: string) => `mock.${accountId}`;

/** `'GET /api/stylists/:id/'` → a matcher. Trailing slashes are optional. */
export function compileRoute(spec: string) {
  const [method, path] = spec.split(' ');
  const keys: string[] = [];
  const source = path
    .replace(/\/+$/, '')
    .split('/')
    .map(part => {
      if (!part.startsWith(':')) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      keys.push(part.slice(1));
      return '([^/]+)';
    })
    .join('/');
  return { method: method.toUpperCase(), pattern: new RegExp(`^${source}/?$`), keys };
}

export function defineMocks(table: Record<string, MockHandler>) {
  for (const [spec, handler] of Object.entries(table))
    routes.push({ ...compileRoute(spec), handler });
}

export function matchRoute(method: string, url: string) {
  const [path, search = ''] = url.split('?');
  for (const route of routes) {
    if (route.method !== method.toUpperCase()) continue;
    const found = route.pattern.exec(path);
    if (!found) continue;
    const params = Object.fromEntries(
      route.keys.map((k, i) => [k, decodeURIComponent(found[i + 1])])
    );
    return { route, params, query: new URLSearchParams(search) };
  }
  return null;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function installMocks(client: AxiosInstance) {
  client.interceptors.request.use(config => {
    const url = config.url ?? '';
    const match = matchRoute(config.method ?? 'get', url);
    if (!match) {
      if (__DEV__) console.log('[mocks] no handler for', config.method, url);
      return config;
    }

    config.adapter = async (cfg: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      await wait(LATENCY_MS);
      const auth = String(cfg.headers?.Authorization ?? '');
      const accountId = auth.startsWith('Bearer mock.')
        ? auth.slice('Bearer mock.'.length)
        : undefined;
      const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data || 'null') : cfg.data;
      const respond = (status: number, data: unknown): AxiosResponse => ({
        data,
        status,
        statusText: String(status),
        headers: {},
        config: cfg,
      });
      // Axios keeps `params` separate from the url; handlers see one query either way.
      const query = new URLSearchParams(match.query);
      for (const [key, value] of Object.entries(cfg.params ?? {})) {
        if (value !== undefined && value !== null) query.set(key, String(value));
      }

      try {
        const data = await match.route.handler({
          params: match.params,
          query,
          body,
          accountId,
        });
        // A real response is parsed fresh every time. Handlers hand back the objects
        // they store, and returning those live would let a later write change data
        // already in the query cache — which then can't tell it has changed at all.
        return respond(200, data === undefined ? data : JSON.parse(JSON.stringify(data)));
      } catch (error) {
        if (!(error instanceof MockError)) throw error;
        const failure = Object.assign(new Error(error.message), {
          isAxiosError: true,
          // The client's interceptors read these, just as they would on a real failure.
          config: cfg,
          response: respond(error.status, { message: error.message }),
        });
        throw failure;
      }
    };
    return config;
  });
}

/** For handlers that need the caller signed in. */
export function requireAccount(request: MockRequest) {
  if (!request.accountId) throw new MockError(401, 'Sign in to continue');
  return request.accountId;
}
