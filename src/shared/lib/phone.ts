/**
 * UK mobile numbers, which is all Phase 1 needs: people type them every way —
 * "07700 900123", "+44 7700 900123", "447700900123" — and the server wants E.164.
 */

/** "+447700900123", or null when it isn't a UK mobile. */
export function normalizeUkMobile(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  const national = digits.startsWith('+44')
    ? digits.slice(3)
    : digits.startsWith('0044')
      ? digits.slice(4)
      : digits.startsWith('44') && digits.length === 12
        ? digits.slice(2)
        : digits.startsWith('0')
          ? digits.slice(1)
          : digits;
  const trimmed = national.replace(/^0/, '');
  return /^7\d{9}$/.test(trimmed) ? `+44${trimmed}` : null;
}

/** "+447700900123" → "07700 900123" */
export function formatUkMobile(e164: string): string {
  const national = `0${e164.replace(/^\+44/, '')}`;
  return `${national.slice(0, 5)} ${national.slice(5)}`;
}

/** Group digits as they're typed: "07700900" → "07700 900". */
export function formatUkMobileInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11);
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}
