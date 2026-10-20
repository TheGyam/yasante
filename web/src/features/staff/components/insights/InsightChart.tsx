import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Link } from '@/shared/ui/Link';
import { Tabs } from '@/shared/ui/Tabs';
import { formatMoney, formatMoneyList, formatNumber, percent } from '../../format';
import type { Insight, InsightRow } from '../../types';
import { BarChart } from '../charts/BarChart';
import { Funnel } from '../charts/Funnel';
import { Heatmap } from '../charts/Heatmap';
import { TimeChart } from '../charts/TimeChart';
import * as ui from '../ui.css';
import * as s from './Insights.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY = 86_400_000;

/** Every day in the range, zero where nothing happened, so the time axis is honest. */
function daily(
  rows: InsightRow[] | null | undefined,
  from: string,
  days: number,
  width: number
): InsightRow[] {
  const byDay = new Map((rows ?? []).map(row => [row.label.slice(0, 10), row]));
  const start = new Date(`${from}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start + index * DAY).toISOString().slice(0, 10);
    return byDay.get(day) ?? { label: day, values: Array<number>(width).fill(0) };
  });
}
const whole = (value: number) => formatNumber(Math.round(value));

/** Each insight in the form that answers its question best. */
export function InsightChart({ insight }: { insight: Insight }) {
  const navigate = useNavigate();
  const [cumulative, setCumulative] = useState('daily');
  const { labels } = insight;
  const days =
    Math.round((new Date(insight.to).getTime() - new Date(insight.from).getTime()) / DAY) + 1;
  const timeSeries = ['growth', 'community', 'app-health', 'area-suggestions'].includes(
    insight.name
  );
  const rows = timeSeries ? daily(insight.rows, insight.from, days, labels.length) : insight.rows;
  const previousStart = new Date(new Date(insight.from).getTime() - days * DAY)
    .toISOString()
    .slice(0, 10);
  const previous =
    timeSeries && insight.previous
      ? daily(insight.previous, previousStart, days, labels.length)
      : null;
  const open = (index: number) => rows[index]?.url && navigate(rows[index].url!);

  switch (insight.name) {
    case 'money': {
      const currency = String(insight.meta.currency ?? 'GBP');
      const money = (value: number) => formatMoney(value, currency);
      const currencies = (insight.meta.currencies ?? []) as unknown as {
        currency: string;
        amount: number;
      }[];
      return (
        <>
          {currencies.length > 1 && (
            <p className={ui.muted}>
              Each currency on its own, never converted: {formatMoneyList(currencies)}. The chart
              below shows {currency}.
            </p>
          )}
          <div className={s.tiles}>
            <Tile label="Total" value={money(Number(insight.meta.total ?? 0))} />
            <Tile label="Average booking" value={money(Number(insight.meta.average ?? 0))} />
            <Tile label="Deposits collected" value={money(Number(insight.meta.deposits ?? 0))} />
          </div>
          <BarChart
            bars={rows.map(row => ({
              label: new Date(row.label).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              }),
              values: row.values,
            }))}
            series={labels}
            stacked
            format={money}
            label={`Completed booking value per week in ${currency}, with deposits`}
            onSelect={open}
          />
        </>
      );
    }
    case 'funnel':
      return (
        <>
          <Funnel
            steps={rows.map(row => ({ label: row.label, value: row.values[0], url: row.url }))}
          />
          <p className={ui.muted}>
            Also in this period: {formatNumber(Number(insight.meta.deposit ?? 0))} paid a deposit,{' '}
            {formatNumber(Number(insight.meta.declined ?? 0))} declined,{' '}
            {formatNumber(Number(insight.meta.no_show ?? 0))} no-shows.
          </p>
        </>
      );
    case 'growth': {
      const running = (values: number[]) =>
        values.map((_, index) => values.slice(0, index + 1).reduce((a, b) => a + b, 0));
      const series = labels.map((name, index) => {
        const values = rows.map(row => row.values[index]);
        return { name, values: cumulative === 'total' ? running(values) : values };
      });
      return (
        <>
          <Tabs
            label="Show"
            value={cumulative}
            onChange={setCumulative}
            items={[
              { value: 'daily', label: 'Each day' },
              { value: 'total', label: 'Running total' },
            ]}
          />
          <TimeChart
            labels={rows.map(row => row.label)}
            series={series}
            stacked
            previous={
              cumulative === 'daily'
                ? previous?.map(row => row.values[0] + row.values[1])
                : undefined
            }
            label="New clients and stylists"
            onSelect={open}
          />
        </>
      );
    }
    case 'booking-times': {
      const hours = rows.map(row => row.x ?? 0);
      const first = hours.length ? Math.min(...hours) : 8;
      const last = hours.length ? Math.max(...hours) : 20;
      const columns = Array.from(
        { length: last - first + 1 },
        (_, index) => `${String(first + index).padStart(2, '0')}`
      );
      const total = rows.reduce((all, row) => all + row.values[0], 0) || 1;
      const at = (row: number, column: number) =>
        rows.find(item => item.y === row && item.x === first + column)?.values[0] ?? null;
      return (
        <Heatmap
          rows={WEEKDAYS}
          columns={columns}
          value={at}
          describe={(row, column) => {
            const count = at(row, column) ?? 0;
            return `${WEEKDAYS[row]} ${columns[column]}:00 · ${formatNumber(count)} ${count === 1 ? 'appointment' : 'appointments'} (${Math.round((count / total) * 100)}%)`;
          }}
          label="Appointments by weekday and hour, UK time"
        />
      );
    }
    case 'areas':
      return (
        <BarChart
          bars={rows.map(row => ({ label: row.label, values: row.values }))}
          series={labels}
          horizontal
          highlight={bar => bar.values[0] > 0 && bar.values[1] === 0}
          label="Clients and active stylists by area"
          onSelect={open}
        />
      );
    case 'empty-searches':
      return (
        <BarChart
          bars={rows.map(row => ({ label: row.label, values: row.values }))}
          series={['Searches']}
          horizontal
          label="Searches that found nothing"
          onSelect={open}
        />
      );
    case 'retention': {
      const cohorts = [...new Set(rows.map(row => row.label.split(' · ')[0]))].sort();
      const weeks = Math.max(1, ...rows.map(row => (row.x ?? 0) + 1));
      const at = (row: number, column: number) =>
        rows.find(item => item.label.startsWith(cohorts[row]) && item.x === column)?.values[0] ??
        null;
      return (
        <Heatmap
          rows={cohorts.map(day =>
            new Date(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          )}
          columns={Array.from({ length: weeks }, (_, index) => `W${index}`)}
          value={at}
          describe={(row, column) => {
            const cell = rows.find(
              item => item.label.startsWith(cohorts[row]) && item.x === column
            );
            return cell
              ? `Joined week of ${cohorts[row]}, week ${column}: ${cell.values[0]}% (${cell.active} of ${cell.cohort})`
              : 'No data';
          }}
          label="Share of each sign-up week still active in later weeks"
        />
      );
    }
    case 'top-stylists':
      return (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Stylist</th>
                {labels.map(label => (
                  <th key={label} scope="col" className={s.number}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label}>
                  <td>
                    {row.url ? (
                      <Link to={row.url} className={ui.link}>
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className={s.number}>{formatNumber(row.values[0])}</td>
                  <td className={s.number}>{formatMoney(row.values[1], row.currency)}</td>
                  <td className={s.number}>{row.values[2] ? row.values[2].toFixed(1) : '—'}</td>
                  <td className={s.number}>{row.values[3] ? `${whole(row.values[3])} h` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'hair-trends': {
      // Groups under the minimum come back empty (null): shown as a dash, never a number.
      const shown = (value: number | null | undefined, format = formatNumber) =>
        value == null ? '—' : format(value);
      const rising = (insight.meta.rising ?? []) as unknown as { style: string; change: number }[];
      const byHair = (insight.meta.byHair ?? []) as unknown as {
        style: string;
        hair: string;
        bookings: number;
      }[];
      return (
        <div className={ui.stack}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Style, area and month</th>
                  {labels.map(label => (
                    <th key={label} scope="col" className={s.number}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className={s.number}>{shown(row.values[0])}</td>
                    <td className={s.number}>{shown(row.values[1])}</td>
                    <td className={s.number}>{shown(row.values[2])}</td>
                    <td className={s.number}>
                      {shown(row.values[3], v => formatMoney(v, row.currency ?? 'GBP'))}
                    </td>
                    <td className={s.number}>{shown(row.values[4], percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rising.length > 0 && (
            <p>Rising: {rising.map(r => `${r.style} (${percent(r.change)})`).join(', ')}</p>
          )}
          {byHair.length > 0 && (
            <p>
              By hair, from people who said yes to research:{' '}
              {byHair
                .map(r => `${r.style} on ${r.hair} hair (${formatNumber(r.bookings)})`)
                .join(', ')}
            </p>
          )}
          <p>{String(insight.meta.note ?? '')}</p>
        </div>
      );
    }
    case 'community':
      return (
        <TimeChart
          labels={rows.map(row => row.label)}
          series={[0, 2, 3].map(index => ({
            name: labels[index],
            values: rows.map(row => row.values[index]),
          }))}
          previous={previous?.map(row => row.values[0])}
          label="Looks posted, and reports opened and resolved, per day"
          onSelect={open}
        />
      );
    case 'area-suggestions':
      return (
        <>
          <TimeChart
            labels={rows.map(row => row.label)}
            series={labels.map((name, index) => ({
              name,
              values: rows.map(row => row.values[index]),
            }))}
            label="Area searches per day, and how many found nothing or failed"
            onSelect={open}
          />
          {typeof insight.meta.note === 'string' && <p className={ui.muted}>{insight.meta.note}</p>}
        </>
      );
    case 'app-health':
      return (
        <>
          <TimeChart
            labels={rows.map(row => row.label)}
            series={labels.map((name, index) => ({
              name,
              values: rows.map(row => row.values[index]),
            }))}
            label="Errors per day by platform"
            onSelect={open}
          />
          {typeof insight.meta.note === 'string' && <p className={ui.muted}>{insight.meta.note}</p>}
        </>
      );
    default:
      return null;
  }
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.tile}>
      <span className={s.tileLabel}>{label}</span>
      <span className={s.tileValue}>{value}</span>
    </div>
  );
}
