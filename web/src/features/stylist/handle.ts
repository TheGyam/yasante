/**
 * Handles are the public page's address, so they're lowercase, short and unmistakable.
 * The same rules as the app (src/features/stylist/handle.ts) and the server.
 */
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;

/** "Braids by Ama!" → "braidsbyama" */
export function toHandle(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^[._]+/, '')
    .slice(0, HANDLE_MAX);
}

/** The reason it can't be used, or undefined when it's fine. */
export function handleProblem(handle: string) {
  if (handle.length < HANDLE_MIN) return `At least ${HANDLE_MIN} characters`;
  if (handle.length > HANDLE_MAX) return `At most ${HANDLE_MAX} characters`;
  if (!/^[a-z0-9]/.test(handle)) return 'Start with a letter or number';
  if (!/^[a-z0-9._]+$/.test(handle)) return 'Letters, numbers, dots and underscores only';
  if (/[._]{2,}/.test(handle)) return 'No repeated dots or underscores';
  if (/[._]$/.test(handle)) return 'Can’t end with a dot or underscore';
  return undefined;
}
