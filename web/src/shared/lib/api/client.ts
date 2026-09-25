/**
 * The HTTP client. The site and the API share an origin (yasante.com/api), so there
 * are no tokens, no CORS and nothing to configure: every read here is public.
 */

/** A response that wasn't a success, carrying what the server said. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly data: { message?: unknown; detail?: unknown } | undefined
  ) {
    super(`The API answered ${status}`);
    this.name = 'ApiError';
  }
}

/** Give up on a request that hasn't answered in this long, rather than spin for ever. */
const TIMEOUT_MS = 15_000;

type Params = Record<string, string | number | undefined | null>;

function withQuery(path: string, params?: Params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, params?: Params) {
  const response = await fetch(withQuery(`/api${path}`, params), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, undefined, params),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
};
