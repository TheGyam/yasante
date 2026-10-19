/** The currency for prices that came without one (older data, made before currencies). */
export const DEFAULT_CURRENCY = 'GBP';
/** The reader's own way of writing numbers: "240,000" or "240.000". */
const locale = (typeof navigator !== 'undefined' && navigator.language) || 'en-GB';

// One formatter per currency and shape, made once: formatting runs for every price shown.
const formatters = new Map<string, Intl.NumberFormat>();
function formatter(currency: string, whole: boolean) {
  const key = `${currency}:${whole}`;
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      // "₦240,000", "$45": the symbol people use there, not "NGN" or "US$".
      currencyDisplay: 'narrowSymbol',
      ...(whole && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    });
    formatters.set(key, found);
  }
  return found;
}

/**
 * A price as the stylist charges it, in her currency (ISO 4217): £45, ₦240,000,
 * GH₵12.50. Never converted: what's shown is what's paid. As the app writes money.
 */
export function formatMoney(amount: number, currency: string) {
  return formatter(currency, Number.isInteger(amount)).format(amount);
}

/** "from £45" when the price is a starting point. */
export function formatPrice(amount: number, currency: string, from?: boolean) {
  return `${from ? 'from ' : ''}${formatMoney(amount, currency)}`;
}

/** The currency's symbol on its own, for a price field's label: "£", "₦", "GH₵". */
export function currencySymbol(currency: string) {
  return (
    formatter(currency, true)
      .formatToParts(0)
      .find(part => part.type === 'currency')?.value ?? currency
  );
}

const KM_PER_MILE = 1.609344;
/** Whether this reader measures in miles: browsers set to the UK or the US. */
export const usesMiles = /-(GB|US)$/i.test(locale);

/** Distances are kept in miles; shown in miles or kilometres, as the reader measures. */
export function formatDistance(miles: number, inMiles = usesMiles) {
  const value = inMiles ? miles : miles * KM_PER_MILE;
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${inMiles ? (rounded === 1 ? 'mile' : 'miles') : 'km'}`;
}

export const toMiles = (amount: number, inMiles: boolean) =>
  inMiles ? amount : Math.round((amount / KM_PER_MILE) * 10) / 10;
export const fromMiles = (miles: number, inMiles: boolean) =>
  inMiles ? miles : Math.round(miles * KM_PER_MILE);

const longDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

/** 3 March 2026 */
export function formatDate(iso: string) {
  return longDate.format(new Date(iso));
}

/** March 2026 */
export function formatMonth(iso: string) {
  return monthYear.format(new Date(iso));
}

/** "1 look", "3 looks". */
export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/** The address form of a name: "South London" → "south-london", as the server slugifies. */
export function slugify(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-');
}

/**
 * Our plait, the mark between parts of a line, as in the app. A private-use character the
 * site's font draws (shared/ui/marks.css); Text colours it. The space before it doesn't
 * break, so a line never starts with the mark.
 */
export const MARK = String.fromCharCode(0xe000);
export const SEP = `${String.fromCharCode(0xa0)}${MARK} `;

/** Text with marks for anywhere the font can't reach (the tab title, sharing): a plain dot. */
export const plain = (text: string) => text.replaceAll(SEP, ' · ').replaceAll(MARK, '·');
