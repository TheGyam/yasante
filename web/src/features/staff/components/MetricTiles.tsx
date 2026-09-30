import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { ArrowUpRight } from 'lucide-react';
import type { Overview as OverviewData } from '../types';
import * as s from './MetricTiles.css';

export function MetricTiles({ metrics }: { metrics: OverviewData['metrics'] }) {
  const number = new Intl.NumberFormat();
  return (
    <div className={s.metrics}>
      {metrics.map(metric => (
        <Link to={metric.url} key={metric.label} className={`${s.card} ${s.metric}`}>
          <div className={s.between}>
            <Text variant="callout" tone="secondary">
              {metric.label}
            </Text>
            <ArrowUpRight size={18} aria-hidden />
          </div>
          <span className={s.number}>{number.format(metric.value)}</span>
          <Text variant="caption" tone="secondary">
            {metric.hint}
          </Text>
        </Link>
      ))}
    </div>
  );
}
