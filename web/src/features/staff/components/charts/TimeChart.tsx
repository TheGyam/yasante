import { useId, useState } from 'react';
import { formatDate, formatNumber } from '../../format';
import { niceTicks, scale, SERIES } from './scale';
import { useWidth } from './useWidth';
import * as s from './charts.css';

export interface TimeSeries {
  name: string;
  values: number[];
  color?: string;
}

const PAD = { top: 12, right: 12, bottom: 28, left: 44 };

/**
 * Values over days or weeks. Hover, tap or arrow keys show exact numbers; clicking a
 * point opens the records behind it. A previous period draws as a dashed line under
 * the first series, and legend items switch series on and off.
 */
export function TimeChart({
  labels,
  series,
  previous,
  area = false,
  stacked = false,
  height = 240,
  format = formatNumber,
  label,
  onSelect,
}: {
  labels: string[];
  series: TimeSeries[];
  previous?: number[] | null;
  area?: boolean;
  stacked?: boolean;
  height?: number;
  format?: (value: number) => string;
  /** What the chart shows, for screen readers. */
  label: string;
  onSelect?: (index: number) => void;
}) {
  const gradient = `area${useId().replace(/[^a-z0-9]/gi, '')}`;
  const [box, width] = useWidth<HTMLDivElement>();
  const [hidden, setHidden] = useState<string[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const shown = series.filter(item => !hidden.includes(item.name));
  const count = labels.length;

  // Stacked series sit on the ones before them.
  const tops = shown.map((_, index) =>
    labels.map((__, day) =>
      shown
        .slice(0, index + 1)
        .reduce((sum, item) => sum + (stacked ? (item.values[day] ?? 0) : 0), 0)
    )
  );
  const valuesOf = (index: number) => (stacked ? tops[index] : shown[index].values);
  const max = Math.max(
    1,
    ...shown.flatMap((_, index) => valuesOf(index)),
    ...(previous && !hidden.includes(series[0]?.name) ? previous : [])
  );
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const x = scale([0, Math.max(1, count - 1)], [PAD.left, width - PAD.right]);
  const y = scale([0, top], [height - PAD.bottom, PAD.top]);
  const path = (values: number[]) =>
    values.map((value, day) => `${day ? 'L' : 'M'}${x(day)},${y(value)}`).join('');
  const labelEvery = Math.max(1, Math.ceil(count / Math.max(2, Math.floor(width / 90))));

  const pick = (clientX: number, rect: DOMRect) => {
    const ratio = (clientX - rect.left - PAD.left) / Math.max(1, rect.width - PAD.left - PAD.right);
    return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
  };

  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active), 90), width - 90);

  return (
    <div className={s.chart}>
      <div ref={box} className={s.plot}>
        <svg
          width={width}
          height={height}
          className={s.svg}
          role="img"
          aria-label={label}
          tabIndex={0}
          onPointerMove={event =>
            setActive(pick(event.clientX, event.currentTarget.getBoundingClientRect()))
          }
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onFocus={() => setActive(count - 1)}
          onClick={event =>
            onSelect?.(pick(event.clientX, event.currentTarget.getBoundingClientRect()))
          }
          onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              const step = event.key === 'ArrowRight' ? 1 : -1;
              setActive(current => Math.min(count - 1, Math.max(0, (current ?? count - 1) + step)));
            } else if (event.key === 'Enter' && active !== null) onSelect?.(active);
          }}
          data-clickable={!!onSelect}
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={SERIES[0]} stopOpacity="0.32" />
              <stop offset="1" stopColor={SERIES[0]} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map(tick => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                className={s.grid}
              />
              <text
                x={PAD.left - 8}
                y={y(tick)}
                className={s.axis}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {format(tick)}
              </text>
            </g>
          ))}
          {labels.map((day, index) =>
            (index % labelEvery === 0 && count - 1 - index >= labelEvery / 2) ||
            index === count - 1 ? (
              <text
                key={day}
                x={x(index)}
                y={height - 8}
                className={s.axis}
                textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
              >
                {formatDate(day)}
              </text>
            ) : null
          )}
          {previous && !hidden.includes(series[0]?.name) && (
            <path d={path(previous)} className={s.previous} />
          )}
          {shown.map((item, index) => {
            const color = item.color ?? SERIES[series.indexOf(item) % SERIES.length];
            const values = valuesOf(index);
            const floor = stacked && index ? tops[index - 1] : labels.map(() => 0);
            const fill =
              (area || stacked) &&
              `${path(values)}L${[...floor]
                .reverse()
                .map((value, back) => `${x(count - 1 - back)},${y(value)}`)
                .join('L')}Z`;
            return (
              <g key={item.name}>
                {fill && (
                  <path
                    d={fill}
                    fill={index === 0 && !stacked ? `url(#${gradient})` : color}
                    fillOpacity={stacked ? 0.35 : 1}
                  />
                )}
                <path
                  d={path(values)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.25"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {count <= 31 &&
                  values.map((value, day) => (
                    <circle
                      key={day}
                      cx={x(day)}
                      cy={y(value)}
                      r={active === day ? 4.5 : 0}
                      fill={color}
                      className={s.dot}
                    />
                  ))}
              </g>
            );
          })}
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={height - PAD.bottom}
              className={s.crosshair}
            />
          )}
        </svg>
        {active !== null && (
          <div className={s.tooltip} style={{ left: tooltipLeft }} role="status">
            <div className={s.tooltipTitle}>{formatDate(labels[active])}</div>
            {shown.map(item => (
              <div key={item.name} className={s.tooltipRow}>
                <span
                  className={s.swatch}
                  style={{ background: item.color ?? SERIES[series.indexOf(item) % SERIES.length] }}
                />
                <span className={s.tooltipName}>{item.name}</span>
                <strong>{format(item.values[active] ?? 0)}</strong>
              </div>
            ))}
            {previous && previous[active] !== undefined && !hidden.includes(series[0]?.name) && (
              <div className={s.tooltipRow}>
                <span className={s.swatchDashed} />
                <span className={s.tooltipName}>Previous period</span>
                <strong>{format(previous[active])}</strong>
              </div>
            )}
            {onSelect && <div className={s.tooltipHint}>Click to see these records</div>}
          </div>
        )}
      </div>
      {series.length > 1 && (
        <div className={s.legend}>
          {series.map((item, index) => (
            <button
              type="button"
              key={item.name}
              className={s.legendItem}
              aria-pressed={!hidden.includes(item.name)}
              onClick={() =>
                setHidden(current =>
                  current.includes(item.name)
                    ? current.filter(name => name !== item.name)
                    : current.length + 1 < series.length
                      ? [...current, item.name]
                      : current
                )
              }
            >
              <span
                className={s.swatch}
                style={{ background: item.color ?? SERIES[index % SERIES.length] }}
              />
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
