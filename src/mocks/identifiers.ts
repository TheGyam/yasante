// Only the development backend uses this. Live clients ask the server; both
// backends read the same policy data so a mock cannot advertise a reserved name.
import policy from '../../backend/apps/common/identifier_policy.json';
import { db } from './db';

export const identifierPolicy = policy;
export const unavailableName = 'That name is not available. Choose another.';
export function normaliseName(input: unknown) {
  const value = String(input ?? '')
    .trim()
    .replace(/^@/, '');
  for (const char of value) if (char.charCodeAt(0) > 127) return value;
  return value.toLowerCase();
}
const compact = (value: string) => value.replace(/[._-]/g, '');
const skeleton = (value: string) =>
  value
    .replace(/[0134578]/g, char => policy.lookalikes[char as keyof typeof policy.lookalikes])
    .replace(/rn/g, 'm')
    .replace(/l/g, 'i');
const reserved = new Set([...policy.routes, ...policy.reserved].map(compact));
const brands = policy.brands.map(skeleton);
const protectedNames = new Set(
  policy.protected
    .flatMap(root => [root, ...policy.affixes.flatMap(a => [root + a, a + root])])
    .map(skeleton)
);

export function isReservedName(value: string) {
  value = normaliseName(value);
  const key = compact(value);
  return (
    reserved.has(key) ||
    brands.some(brand => skeleton(key).includes(brand)) ||
    [key, ...value.split(/[._-]/)].some(
      candidate =>
        protectedNames.has(skeleton(candidate)) ||
        protectedNames.has(skeleton(candidate.replace(/[0-9]+$/, '')))
    )
  );
}

export function nameProblem(value: string, maxLength: number, current?: string) {
  if (current && value === current) return undefined;
  if (
    value.length < 3 ||
    value.length > maxLength ||
    !/^[a-z0-9][a-z0-9._]*[a-z0-9]$/.test(value) ||
    /[._]{2}/.test(value)
  )
    return `Use 3 to ${maxLength} letters, numbers, dots or underscores, starting and ending with a letter or number, without repeated separators.`;
  return isReservedName(value) ? unavailableName : undefined;
}

export function nameTaken(value: string, accountId?: string) {
  return (
    [...db.accounts.values()].some(
      a => a.id !== accountId && a.username?.toLowerCase() === value
    ) ||
    [...db.stylists.values()].some(
      p => p.accountId !== accountId && p.handle.toLowerCase() === value
    )
  );
}
