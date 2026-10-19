/** Numbers, money and times as the team reads them: UK time, pounds, plain English. */

const UK = 'Europe/London';
const number = new Intl.NumberFormat('en-GB');
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = (value: number) => number.format(value);
export const formatCompact = (value: number) =>
  Math.abs(value) >= 10_000 ? compact.format(value) : number.format(value);

/** No pence above 1,000: nobody reads them at that size. Never converted between currencies. */
export const formatMoney = (value: number, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : undefined,
  }).format(value);

/** Each currency's own total side by side, never added together: "$60 · €45 · GH₵300". */
export const formatMoneyList = (amounts: readonly { currency: string; amount: number }[]) =>
  amounts.map(m => formatMoney(m.amount, m.currency)).join(' · ');

export const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: UK });

export const formatDateLong = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: UK,
  });

export const formatDateTime = (value: string | Date) =>
  `${new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: UK,
  })} UK`;

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];
const relative = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto', style: 'short' });

/** "3 hr ago", "yesterday", "just now". */
export function formatAgo(value: string | Date, now = Date.now()) {
  const seconds = (new Date(value).getTime() - now) / 1000;
  const [unit, size] = UNITS.find(([, size]) => Math.abs(seconds) >= size) ?? ['second', 1];
  if (unit === 'second') return 'just now';
  return relative.format(Math.round(seconds / size), unit);
}

export const hoursSince = (value: string | Date, now = Date.now()) =>
  (now - new Date(value).getTime()) / 3_600_000;

/** Good morning / afternoon / evening, by the clock in London. */
export function greeting(now = new Date()) {
  const hour = Number(
    now.toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: UK })
  );
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export const percent = (value: number) => `${value > 0 ? '+' : ''}${Math.round(value)}%`;

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;
