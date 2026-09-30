import { vars } from '@/shared/theme/vars.css';

/** Series colours, in order: the accent leads; good and bad keep their own meaning. */
export const SERIES = [
  vars.color.accent,
  vars.color.gold,
  vars.color.success,
  vars.color.text.secondary,
  vars.color.danger,
];

/** Round numbers for an axis: 0, 5, 10… or 0, 250, 500… never 0, 42, 83. */
export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map(n => n * power).find(n => n >= rough) ?? rough;
  const ticks = [];
  for (let value = 0; value < max + step; value += step) ticks.push(Number(value.toFixed(10)));
  return ticks;
}

export const scale = (domain: [number, number], range: [number, number]) => (value: number) =>
  domain[1] === domain[0]
    ? range[0]
    : range[0] + ((value - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0]);

/** A CSV of exactly what a chart shows, for the download button. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [header, ...rows].map(row => row.map(cell).join(',')).join('\n');
}

export function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: `${name}.csv` });
  link.click();
  URL.revokeObjectURL(url);
}
