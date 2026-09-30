import { Text } from '@/shared/ui/Text';
import type { Overview as OverviewData } from '../types';
import * as s from './TrendChart.css';
const number = new Intl.NumberFormat();
const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
export function TrendChart({ trend }: { trend: OverviewData['trend'] }) {
  const peak = Math.max(1, ...trend.series.flatMap(series => series.values));
  return (
    <>
      {!trend.series.length ? (
        <div className={s.empty}>
          <Text variant="subhead">
            Activity charts are available with people or booking access.
          </Text>
        </div>
      ) : (
        <>
          <svg
            viewBox="0 0 640 220"
            className={s.chart}
            role="img"
            aria-label="Daily new people and booking requests. Exact values are available in the activity table below."
          >
            {[0, 0.5, 1].map(level => (
              <g key={level}>
                <line
                  x1="30"
                  x2="630"
                  y1={190 - level * 170}
                  y2={190 - level * 170}
                  stroke="currentColor"
                  opacity="0.12"
                />
                <text x="0" y={195 - level * 170} fontSize="11" fill="currentColor">
                  {Math.ceil(peak * level)}
                </text>
              </g>
            ))}
            {trend.series.map((series, index) => (
              <g key={series.label} className={index ? s.chartSecond : undefined}>
                <polyline
                  points={series.values
                    .map((value, day) => `${30 + day * (600 / 13)},${190 - (value / peak) * 170}`)
                    .join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {series.values.map((value, day) => (
                  <circle
                    key={day}
                    cx={30 + day * (600 / 13)}
                    cy={190 - (value / peak) * 170}
                    r="3"
                    fill="currentColor"
                  >
                    <title>
                      {date(trend.dates[day])}: {value} {series.label.toLowerCase()}
                    </title>
                  </circle>
                ))}
              </g>
            ))}
            <text x="30" y="216" fontSize="11" fill="currentColor">
              {date(trend.dates[0])}
            </text>
            <text x="630" y="216" textAnchor="end" fontSize="11" fill="currentColor">
              {date(trend.dates[13])}
            </text>
          </svg>
          <div className={s.legend}>
            {trend.series.map((series, index) => (
              <span className={`${s.row} ${index ? s.chartSecond : ''}`} key={series.label}>
                <span className={s.dot} />
                {series.label}
                <strong>
                  {number.format(series.values.reduce((sum, value) => sum + value, 0))}
                </strong>
              </span>
            ))}
          </div>
          <details>
            <summary className={s.muted}>View activity table</summary>
            <div className={s.recordTableWrap}>
              <table className={s.table}>
                <caption className="visually-hidden">Daily activity, last 14 days</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    {trend.series.map(series => (
                      <th scope="col" key={series.label}>
                        {series.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trend.dates.map((day, index) => (
                    <tr key={day}>
                      <th scope="row">{date(day)}</th>
                      {trend.series.map(series => (
                        <td key={series.label} data-label={series.label}>
                          {series.values[index]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </>
  );
}
