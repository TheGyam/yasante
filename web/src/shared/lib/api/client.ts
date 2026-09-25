/**
 * The HTTP client. The site and the API share an origin (yasante.com/api), so there's
 * no CORS. Most reads are public; a signed-in stylist's requests carry her token, which
 * the auth feature hands over through an AuthBridge (shared/ never imports a feature).
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

/** How the client reaches the signed-in session, registered by the auth feature. */
export interface AuthBridge {
  accessToken(): string | undefined;
  /** A fresh access token after a 401, or undefined when the session is over. */
  refresh(): Promise<string | undefined>;
}

let bridge: AuthBridge | undefined;

export function setAuthBridge(next: AuthBridge | undefined) {
  bridge = next;
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

type Method = 'GET' | 'POST' | 'PATCH';

async function send(method: Method, url: string, body: unknown, token: string | undefined) {
  const form = body instanceof FormData;
  return fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined || form ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function request<T>(method: Method, path: string, body?: unknown, params?: Params) {
  const url = withQuery(`/api${path}`, params);
  const token = bridge?.accessToken();
  let response = await send(method, url, body, token);
  // An expired token: refresh once and try again. A second 401 is a real answer.
  if (response.status === 401 && token && bridge) {
    const fresh = await bridge.refresh();
    if (fresh) response = await send(method, url, body, fresh);
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  /** A file, as multipart form data. */
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, form),
};
