import { deviceLocale } from './region';

/** The currency for prices that came without one (older data, made before currencies). */
export const DEFAULT_CURRENCY = 'GBP';

// One formatter per currency and shape, made once: formatting runs for every price shown.
const formatters = new Map<string, Intl.NumberFormat>();
function formatter(given: string, whole: boolean) {
  // A server from before currencies sends none: those prices were all pounds.
  const currency = given || DEFAULT_CURRENCY;
  const key = `${currency}:${whole}`;
  let found = formatters.get(key);
  if (!found) {
    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency,
      ...(whole && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    };
    try {
      // "₦240,000", "$45": the symbol people use there, not "NGN" or "US$".
      found = new Intl.NumberFormat(deviceLocale, { ...options, currencyDisplay: 'narrowSymbol' });
    } catch {
      found = new Intl.NumberFormat(deviceLocale, options);
    }
    formatters.set(key, found);
  }
  return found;
}

/**
 * A price as the stylist charges it, in her currency (ISO 4217): £45, ₦240,000,
 * GH₵12.50. Never converted: what's shown is what's paid.
 */
export function formatMoney(amount: number, currency: string) {
  return formatter(currency, Number.isInteger(amount)).format(amount);
}

/** The currency's symbol on its own, for a price field's label: "£", "₦", "GH₵". */
export function currencySymbol(currency: string) {
  return (
    formatter(currency, true)
      .formatToParts(0)
      .find(part => part.type === 'currency')?.value ?? currency
  );
}

/** Parse what someone typed into a price field: "£45.50", "45,50", "240,000" and "45" all work. */
export function parseMoney(text: string): number {
  let digits = text.replace(/[^\d.,]/g, '');
  const comma = digits.lastIndexOf(','),
    dot = digits.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    // Both: the last one is the decimal point ("1,250.50", "1.250,50").
    const point = Math.max(comma, dot);
    digits = digits.slice(0, point).replace(/[.,]/g, '') + '.' + digits.slice(point + 1);
  } else if (comma >= 0) {
    // Commas alone: grouping when every group after one has three digits ("240,000"),
    // else a decimal comma ("45,50").
    digits = /^\d{1,3}(,\d{3})+$/.test(digits)
      ? digits.replace(/,/g, '')
      : digits.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3}){2,}$/.test(digits)) {
    // Dots as grouping, as German writes "1.250.000".
    digits = digits.replace(/\./g, '');
  }
  const value = Number.parseFloat(digits);
  return Number.isFinite(value) ? value : 0;
}

const KM_PER_MILE = 1.609344;

/** Distances are kept in miles; shown in miles or kilometres, as the reader measures. */
export function formatDistance(miles: number, inMiles: boolean) {
  const value = inMiles ? miles : miles * KM_PER_MILE;
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${inMiles ? (rounded === 1 ? 'mile' : 'miles') : 'km'}`;
}

/** What she typed, in her units, as the miles it's kept in. */
export const toMiles = (amount: number, inMiles: boolean) =>
  inMiles ? amount : Math.round((amount / KM_PER_MILE) * 10) / 10;

/** Miles as she'd type them, in her units. */
export const fromMiles = (miles: number, inMiles: boolean) =>
  inMiles ? miles : Math.round(miles * KM_PER_MILE);

/** "$60 · €45 · GH₵300": money in several currencies, each on its own, never added. */
export function formatMoneyList(amounts: readonly { currency: string; amount: number }[]) {
  return amounts.map(m => formatMoney(m.amount, m.currency)).join(SEP);
}

/**
 * Our plait, the mark between parts of a line ("Ama Mensah ⟨plait⟩ Knotless braids"). A
 * private-use character drawn by the YasanteMarks font; Text colours and draws it. The
 * space before it doesn't break, so a line never starts with the mark.
 */
export const MARK = String.fromCharCode(0xe000);
export const SEP = `${String.fromCharCode(0xa0)}${MARK} `;

/** Text with marks as a screen reader should say it: the parts with pauses between. */
export const spoken = (text: string) => text.replaceAll(SEP, ', ').replaceAll(MARK, ',');

/** Text with marks for anywhere outside the app (calendars, sharing): a plain dot instead. */
export const plain = (text: string) => text.replaceAll(SEP, ' · ').replaceAll(MARK, '·');
