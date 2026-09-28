/** A full UK postcode, spaced or not. */
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

/**
 * The names people use for where a postcode is: the constituency ("Peckham"), the
 * ward ("Rye Lane") and the borough ("Southwark"), from postcodes.io (free, no key,
 * UK open data). Long official names are left out; nobody says them.
 */
export async function areasFor(postcode: string): Promise<string[]> {
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s+/g, ''))}`
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('Postcode lookup failed');
  const { result } = await response.json();
  const names: string[] = [
    result.parliamentary_constituency,
    result.admin_ward,
    result.admin_district,
  ].filter((n): n is string => !!n && n.length <= 24 && !/ and |,/.test(n));
  return [...new Set(names)];
}
