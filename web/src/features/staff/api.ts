import { ApiError } from '@/shared/lib/api/client';

export async function readStaff<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/data/${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  const data = response.headers.get('content-type')?.includes('json')
    ? await response.json()
    : { message: 'The request was rejected. Reload the page and try again.' };
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export async function writeStaff<T>(path: string, body: FormData, csrf: string): Promise<T> {
  const response = await fetch(`/data/${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    body,
    headers: { Accept: 'application/json', 'X-CSRFToken': csrf },
    signal: AbortSignal.timeout(30_000),
  });
  const data = response.headers.get('content-type')?.includes('json')
    ? await response.json()
    : { message: 'The request was rejected. Reload the page before trying again.' };
  if (!response.ok && response.status !== 422) throw new ApiError(response.status, data);
  return data as T;
}
