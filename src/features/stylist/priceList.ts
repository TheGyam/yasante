import { parseMoney } from '@/shared/lib/format';
/**
 * Reading a price list she already wrote.
 *
 * Every stylist has one — in her notes app, an Instagram highlight, a WhatsApp
 * broadcast — and retyping it is the dullest twenty minutes of setting up. So she
 * pastes it and we read it, line by line, then show her what we understood before
 * anything is saved. A line we can't price is never guessed at; it comes back
 * empty and she fills it in.
 */

export interface ParsedService {
  /** The line as she pasted it, so a row she has to fix is recognisable. */
  raw: string;
  name: string;
  /** Pounds. Missing when the line had no number we trusted. */
  price?: number;
  /** "from £120" — a range, a plus, or the word itself. */
  fromPrice: boolean;
  durationMinutes?: number;
  /** "BRAIDS", "Twists:" — a heading over a group of services, not a service. */
  heading?: boolean;
}

/** "4 hrs", "1.5hr", "2 hrs 30", "2h30". A bare number after the hours is minutes. */
const HOURS = /(\d+(?:[.,]\d+)?)\s*(?:hrs?|hours?|h)(?![a-z])\.?(\s*(\d{1,2})(?!\d))?/i;
const MINUTES = /(\d+)\s*(?:mins?|minutes?|m)(?![a-z])\.?/i;
/** A currency symbol stylists write: £45, $60, €50, ₦25,000, GH₵300, KSh 2,000. */
const SYMBOL = String.raw`(?:GH₵|GH¢|CA\$|A\$|NZ\$|US\$|KSh|[£$€₦₵¢¥₹])`;
/** An amount: "45", "45.50", "45,50", and grouped thousands like "25,000" or "1,250.50". */
const AMOUNT = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
/** "£45-£60", "45 to 60" — the low end is the price, and it's a "from". */
const RANGE = new RegExp(
  String.raw`(${SYMBOL}?\s*(?:${AMOUNT}))\s*(?:-|–|—|to)\s*${SYMBOL}?\s*(?:${AMOUNT})`,
  'i'
);
const PRICED = new RegExp(String.raw`${SYMBOL}\s*(${AMOUNT})`);
/** No currency anywhere: the last number on the line is the price. */
const LAST_NUMBER = new RegExp(String.raw`(${AMOUNT})(?!.*\d)`);
/** "25,000" is grouped like money, not like a year or a phone number. */
const GROUPED = /^\d{1,3}(?:,\d{3})+/;
const FROM = /\bfrom\b|\bstarting\b|\bonwards\b|\d\s*\+/i;

const number = (text: string) => parseMoney(text);

/** Cut a match out of the line, leaving a space so words either side don't join up. */
const cut = (text: string, at: number, length: number) =>
  `${text.slice(0, at)} ${text.slice(at + length)}`;

/**
 * How long the work takes, and what's left of the line without it.
 *
 * `absorbTrailing` decides what "2 hrs 45" means: the minutes of a 2h45 job, or two
 * hours at £45. Only the whole line can say, so parseLine tries it both ways.
 */
function readDuration(text: string, absorbTrailing: boolean) {
  let rest = text;
  let minutes = 0;

  const hours = HOURS.exec(rest);
  if (hours) {
    minutes += Math.round(number(hours[1]) * 60);
    // "4 hrs 90" isn't 4h90m — anything under an hour can be, anything else is a price.
    const trailing = hours[3] ? Number(hours[3]) : undefined;
    const isMinutes = absorbTrailing && trailing !== undefined && trailing < 60;
    if (isMinutes) minutes += trailing;
    rest = cut(rest, hours.index, hours[0].length - (isMinutes ? 0 : (hours[2]?.length ?? 0)));
  }

  const mins = MINUTES.exec(rest);
  if (mins) {
    minutes += Number(mins[1]);
    rest = cut(rest, mins.index, mins[0].length);
  }

  return { minutes: minutes || undefined, rest };
}

/** A bare number this big is a year or a phone number, not what she charges. */
const BARE_PRICE_MAX = 1000;

/** The price, and what's left of the line without it. */
function readPrice(text: string) {
  const priced = PRICED.exec(text);
  const found = priced ?? LAST_NUMBER.exec(text);
  if (!found) return { price: undefined, rest: text };
  const price = number(found[1]);
  if (!Number.isFinite(price) || price <= 0) return { price: undefined, rest: text };
  // "PRICES 2026 ✨" is a heading. Without a currency in front, a big bare number isn't
  // a price, unless it's grouped like one ("25,000").
  if (!priced && price >= BARE_PRICE_MAX && !GROUPED.test(found[1]))
    return { price: undefined, rest: text };
  return { price, rest: cut(text, found.index, found[0].length) };
}

function cleanName(text: string) {
  const name = text
    // Leftovers of a range we already collapsed, and the words that made it a "from".
    .replace(new RegExp(String.raw`${SYMBOL}\s*(?:${AMOUNT})`, 'g'), ' ')
    .replace(/\bfrom\b|\bstarting (?:at|from)\b|\bonwards\b|\bapprox\.?\b/gi, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/^[^A-Za-z0-9]+/, '')
    .replace(/[^A-Za-z0-9)]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Collapse "£45-£60" to its low end, so the price reader sees one number. */
function collapseRange(text: string) {
  const range = RANGE.exec(text);
  if (!range) return { text, ranged: false };
  return {
    text: `${text.slice(0, range.index)}${range[1]}${text.slice(range.index + range[0].length)}`,
    ranged: true,
  };
}

function read(raw: string, absorbTrailing: boolean) {
  const { minutes, rest } = readDuration(raw, absorbTrailing);
  const { text, ranged } = collapseRange(rest);
  return { minutes, ranged, ...readPrice(text) };
}

export function parseLine(raw: string): ParsedService {
  // "2 hrs 45" is 2h45m when the line prices itself some other way, and two hours at
  // £45 when it doesn't. A price list line always has a price, so that reading wins.
  const absorbed = read(raw, true);
  const { minutes, ranged, price, rest } =
    absorbed.price === undefined ? read(raw, false) : absorbed;

  return {
    raw,
    name: cleanName(rest),
    price,
    fromPrice: price !== undefined && (ranged || FROM.test(raw)),
    durationMinutes: minutes,
  };
}

/**
 * Two names for the same service. Pasting a list she has pasted before shouldn't
 * give her "Knotless braids" twice because one of them said "knotless braids!".
 */
export const serviceKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * A line that titles a group rather than naming a service: no numbers, and either
 * shouted in capitals, ended with a colon, or nothing but decoration.
 */
export function isHeading(raw: string) {
  if (/\d/.test(raw)) return false;
  const letters = raw.replace(/[^A-Za-z]/g, '');
  if (!letters) return true;
  return raw.trim().endsWith(':') || (letters.length > 1 && letters === letters.toUpperCase());
}

/** A pasted list, one entry per line that says anything at all. */
export function parsePriceList(text: string): ParsedService[] {
  return text
    .split(/\r?\n/)
    .slice(0, 200)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => ({ ...parseLine(line), heading: isHeading(line) || undefined }))
    .filter(service => service.name.length > 0 || service.heading);
}

/** What she typed in a "how long" field: "4 hrs", "2h30", "90 mins", "3". */
export function parseDuration(text: string): number | undefined {
  const { minutes } = readDuration(text, true);
  if (minutes) return minutes;
  // A bare number in that field means hours, which is how stylists say it.
  const bare = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(bare) && bare > 0 ? Math.round(bare * 60) : undefined;
}
