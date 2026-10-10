/** UK postcodes, as the app reads them (src/shared/utils/postcode.ts at the repo root). */
export const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** "se154qj" → "SE15 4QJ". */
export function tidyPostcode(postcode: string) {
  const bare = postcode.replace(/\s+/g, '').toUpperCase();
  return bare.length > 3 ? `${bare.slice(0, -3)} ${bare.slice(-3)}` : bare;
}

/** The street and postcode back out of an address ("12 Bellenden Road, SE15 4QJ"). */
export function splitAddress(address = '') {
  const parts = address.split(',').map(p => p.trim());
  const last = parts[parts.length - 1] ?? '';
  return POSTCODE.test(last)
    ? { street: parts.slice(0, -1).join(', '), postcode: last }
    : { street: address, postcode: '' };
}

/** "12 Bellenden Road, SE15 4QJ", or just the street while the postcode isn't whole. */
export function joinAddress(street: string, postcode: string) {
  return [street.trim(), POSTCODE.test(postcode.trim()) ? tidyPostcode(postcode) : '']
    .filter(Boolean)
    .join(', ');
}
