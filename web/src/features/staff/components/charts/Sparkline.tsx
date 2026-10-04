import { useId } from 'react';
import { vars } from '@/shared/theme/vars.css';
import { scale } from './scale';
import * as s from './Sparkline.css';

/** A trend at a glance: no axes, just the shape, with the last point marked. */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  color = vars.color.accent,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const id = `spark${useId().replace(/[^a-z0-9]/gi, '')}`;
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const x = scale([0, values.length - 1], [2, width - 2]);
  const y = scale([0, max], [height - 3, 3]);
  const points = values.map((value, index) => `${x(index)},${y(value)}`);
  const last = values.length - 1;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className={s.svg}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${x(0)},${height} ${points.join(' ')} ${x(last)},${height}`}
        fill={`url(#${id})`}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(last)} cy={y(values[last])} r="2.5" fill={color} />
    </svg>
  );
}
