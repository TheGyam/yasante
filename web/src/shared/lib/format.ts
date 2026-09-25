const pounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});
const pence = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
});

/** £45, £12.50 — as the app writes money. */
export function formatMoney(amount: number) {
  return (Number.isInteger(amount) ? pounds : pence).format(amount);
}

/** "from £45" when the price is a starting point. */
export function formatPrice(amount: number, from?: boolean) {
  return `${from ? 'from ' : ''}${formatMoney(amount)}`;
}

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
