import { useState } from 'react';
import { vars } from '@/shared/theme/vars.css';
import { useWidth } from './useWidth';
import * as s from './charts.css';

/**
 * A grid where colour is the number: when people book (weekday × hour), who comes back
 * (cohort × week). Empty cells stay neutral so a zero never looks like a small number.
 */
export function Heatmap({
  rows,
  columns,
  value,
  describe,
  label,
}: {
  rows: string[];
  columns: string[];
  value: (row: number, column: number) => number | null;
  describe: (row: number, column: number) => string;
  label: string;
}) {
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<[number, number] | null>(null);
  const left = 64;
  const size = Math.max(10, Math.min(36, (width - left) / Math.max(1, columns.length)));
  const height = rows.length * size + 24;
  const all = rows.flatMap((_, r) => columns.map((__, c) => value(r, c) ?? 0));
  const max = Math.max(1, ...all);
  const every = Math.max(1, Math.ceil(columns.length / Math.floor((width - left) / 32)));
  return (
    <div className={s.chart}>
      <div ref={box} className={s.plot}>
        <svg width={width} height={height} className={s.svg} role="img" aria-label={label}>
          {rows.map((row, r) => (
            <text
              key={row}
              x={left - 8}
              y={r * size + size / 2}
              className={s.axis}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {row}
            </text>
          ))}
          {columns.map((column, c) =>
            c % every === 0 ? (
              <text
                key={column}
                x={left + c * size + size / 2}
                y={rows.length * size + 16}
                className={s.axis}
                textAnchor="middle"
              >
                {column}
              </text>
            ) : null
          )}
          {rows.map((_, r) =>
            columns.map((__, c) => {
              const amount = value(r, c);
              const strength = amount ? 0.15 + 0.85 * (amount / max) : 0;
              return (
                <rect
                  key={`${r}-${c}`}
                  x={left + c * size}
                  y={r * size}
                  width={size}
                  height={size}
                  rx={4}
                  className={s.cell}
                  data-active={active?.[0] === r && active?.[1] === c}
                  fill={amount ? vars.color.accent : vars.color.glass.fill}
                  fillOpacity={amount ? strength : 1}
                  onPointerEnter={() => setActive([r, c])}
                  onPointerLeave={() => setActive(null)}
                >
                  <title>{describe(r, c)}</title>
                </rect>
              );
            })
          )}
        </svg>
        {active && (
          <div
            className={s.tooltip}
            style={{
              left: Math.min(Math.max(left + active[1] * size + size / 2, 90), width - 90),
              top: active[0] * size + size + 6,
            }}
            role="status"
          >
            {describe(active[0], active[1])}
          </div>
        )}
      </div>
    </div>
  );
}
