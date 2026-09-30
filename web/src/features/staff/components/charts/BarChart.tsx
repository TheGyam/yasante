import { useState } from 'react';
import { formatNumber } from '../../format';
import { niceTicks, scale, SERIES } from './scale';
import { useWidth } from './useWidth';
import * as s from './charts.css';

export interface Bars {
  label: string;
  values: number[];
}

/**
 * Bars for comparing things: horizontal for named categories (areas, searches), with the
 * value written at the end so nobody reads an axis; vertical for weeks. Several series
 * group side by side, or stack when they add up to a whole.
 */
export function BarChart({
  bars,
  series,
  horizontal = false,
  stacked = false,
  format = formatNumber,
  highlight,
  label,
  onSelect,
}: {
  bars: Bars[];
  series: string[];
  horizontal?: boolean;
  stacked?: boolean;
  format?: (value: number) => string;
  /** Bars to call out (demand with no supply). */
  highlight?: (bar: Bars) => boolean;
  label: string;
  onSelect?: (index: number) => void;
}) {
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const totals = bars.map(bar =>
    stacked ? bar.values.reduce((a, b) => a + b, 0) : Math.max(...bar.values)
  );
  const ticks = niceTicks(Math.max(1, ...totals));
  const top = ticks[ticks.length - 1];
  const groups = stacked ? 1 : series.length;

  if (horizontal) {
    const labelWidth = Math.min(180, Math.max(90, width * 0.28));
    const row = groups > 1 ? 14 * groups + 14 : 30;
    const height = bars.length * row + 8;
    const x = scale([0, top], [labelWidth, width - 56]);
    return (
      <div className={s.chart}>
        <div ref={box} className={s.plot}>
          <svg
            width={width}
            height={height}
            className={s.svg}
            role="img"
            aria-label={label}
            data-clickable={!!onSelect}
          >
            {bars.map((bar, index) => {
              const y0 = index * row + 4;
              let offset = 0;
              return (
                <g
                  key={bar.label}
                  className={s.bar}
                  data-dim={active !== null && active !== index}
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive(null)}
                  onClick={() => onSelect?.(index)}
                  tabIndex={onSelect ? 0 : undefined}
                  onKeyDown={event => event.key === 'Enter' && onSelect?.(index)}
                  role={onSelect ? 'link' : undefined}
                  aria-label={`${bar.label}: ${bar.values.map((value, i) => `${series[i]} ${format(value)}`).join(', ')}`}
                >
                  <text
                    x={labelWidth - 10}
                    y={y0 + (row - 8) / 2}
                    className={s.barLabel}
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {bar.label.length > 22 ? `${bar.label.slice(0, 21)}…` : bar.label}
                  </text>
                  {bar.values.map((value, i) => {
                    const start = stacked ? offset : 0;
                    offset += value;
                    const barHeight = groups > 1 ? 12 : row - 12;
                    const y = groups > 1 ? y0 + i * 14 + 2 : y0 + 2;
                    const color =
                      highlight?.(bar) && i === 0 ? SERIES[4] : SERIES[i % SERIES.length];
                    return (
                      <rect
                        key={i}
                        x={x(start)}
                        y={y}
                        width={Math.max(value ? 2 : 0, x(start + value) - x(start))}
                        height={barHeight}
                        rx={4}
                        fill={color}
                      />
                    );
                  })}
                  <text
                    x={x(stacked ? totals[index] : Math.max(...bar.values)) + 8}
                    y={y0 + (row - 8) / 2}
                    className={s.barValue}
                    dominantBaseline="middle"
                  >
                    {stacked || groups === 1
                      ? format(totals[index])
                      : bar.values.map(format).join(' · ')}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {series.length > 1 && <Legend series={series} />}
      </div>
    );
  }

  const height = 240;
  const pad = { top: 12, bottom: 28, left: 52, right: 8 };
  const y = scale([0, top], [height - pad.bottom, pad.top]);
  const slot = (width - pad.left - pad.right) / Math.max(1, bars.length);
  const barWidth = Math.min(48, slot * 0.7) / groups;
  const labelEvery = Math.max(1, Math.ceil(bars.length / Math.max(2, Math.floor(width / 80))));
  return (
    <div className={s.chart}>
      <div ref={box} className={s.plot}>
        <svg
          width={width}
          height={height}
          className={s.svg}
          role="img"
          aria-label={label}
          data-clickable={!!onSelect}
        >
          {ticks.map(tick => (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(tick)}
                y2={y(tick)}
                className={s.grid}
              />
              <text
                x={pad.left - 8}
                y={y(tick)}
                className={s.axis}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {format(tick)}
              </text>
            </g>
          ))}
          {bars.map((bar, index) => {
            const center = pad.left + slot * index + slot / 2;
            let offset = 0;
            return (
              <g
                key={bar.label}
                className={s.bar}
                data-dim={active !== null && active !== index}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onClick={() => onSelect?.(index)}
              >
                <rect
                  x={center - slot / 2}
                  y={pad.top}
                  width={slot}
                  height={height - pad.top - pad.bottom}
                  fill="transparent"
                />
                {bar.values.map((value, i) => {
                  const base = stacked ? offset : 0;
                  offset += value;
                  const x = stacked
                    ? center - barWidth / 2
                    : center - (barWidth * groups) / 2 + i * barWidth;
                  return (
                    <rect
                      key={i}
                      x={x}
                      y={y(base + value)}
                      width={Math.max(1, barWidth - (groups > 1 ? 2 : 0))}
                      height={Math.max(0, y(base) - y(base + value))}
                      rx={3}
                      fill={SERIES[i % SERIES.length]}
                    />
                  );
                })}
                {((index % labelEvery === 0 && bars.length - 1 - index >= labelEvery / 2) ||
                  index === bars.length - 1) && (
                  <text x={center} y={height - 8} className={s.axis} textAnchor="middle">
                    {bar.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {active !== null && (
          <div
            className={s.tooltip}
            style={{
              left: Math.min(Math.max(pad.left + slot * active + slot / 2, 90), width - 90),
            }}
            role="status"
          >
            <div className={s.tooltipTitle}>{bars[active].label}</div>
            {series.map((name, i) => (
              <div key={name} className={s.tooltipRow}>
                <span className={s.swatch} style={{ background: SERIES[i % SERIES.length] }} />
                <span className={s.tooltipName}>{name}</span>
                <strong>{format(bars[active].values[i] ?? 0)}</strong>
              </div>
            ))}
            {onSelect && <div className={s.tooltipHint}>Click to see these records</div>}
          </div>
        )}
      </div>
      {series.length > 1 && <Legend series={series} />}
    </div>
  );
}

function Legend({ series }: { series: string[] }) {
  return (
    <div className={s.legend}>
      {series.map((name, index) => (
        <span key={name} className={s.legendItem} aria-hidden>
          <span className={s.swatch} style={{ background: SERIES[index % SERIES.length] }} />
          {name}
        </span>
      ))}
    </div>
  );
}
