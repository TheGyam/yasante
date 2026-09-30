import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Link } from '@/shared/ui/Link';
import { formatNumber, percent } from '../../format';
import type { Metric } from '../../types';
import { Sparkline } from '../charts/Sparkline';
import * as s from './KeyNumbers.css';

/** This week against last, with the last fortnight's shape. Each opens its list. */
export function KeyNumbers({ metrics }: { metrics: Metric[] }) {
  return (
    <section className={s.grid} aria-label="This week">
      {metrics.map(metric => {
        const Arrow =
          metric.change === null || metric.change === 0
            ? Minus
            : metric.change > 0
              ? ArrowUpRight
              : ArrowDownRight;
        const tone =
          metric.change === null || metric.change === 0
            ? 'flat'
            : metric.change > 0
              ? 'up'
              : 'down';
        return (
          <Link key={metric.label} to={metric.url} className={s.tile}>
            <span className={s.label}>{metric.label}</span>
            <span className={s.value}>{formatNumber(metric.value)}</span>
            <span className={s.foot}>
              <span className={s.change} data-tone={tone}>
                <Arrow size={12} aria-hidden />
                {metric.change === null
                  ? metric.value
                    ? 'New this week'
                    : 'No change'
                  : `${percent(metric.change)} vs last week`}
              </span>
              <Sparkline values={metric.values} width={88} height={28} />
            </span>
          </Link>
        );
      })}
    </section>
  );
}
