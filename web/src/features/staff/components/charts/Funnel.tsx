import { ChevronRight } from 'lucide-react';
import { Link } from '@/shared/ui/Link';
import { formatNumber } from '../../format';
import * as s from './Funnel.css';

/**
 * Steps people go through, each bar as wide as the share still with us, and the drop
 * between steps written out, because that's the number worth acting on.
 */
export function Funnel({ steps }: { steps: { label: string; value: number; url?: string }[] }) {
  const first = Math.max(1, steps[0]?.value ?? 0);
  return (
    <ol className={s.funnel}>
      {steps.map((step, index) => {
        const share = step.value / first;
        const previous = steps[index - 1]?.value;
        const kept = previous ? step.value / previous : null;
        const body = (
          <>
            <span className={s.label}>{step.label}</span>
            <span className={s.track}>
              <span
                className={s.fill}
                style={{ width: `${Math.max(share * 100, step.value ? 2 : 0)}%` }}
              />
            </span>
            <span className={s.value}>
              {formatNumber(step.value)}
              <span className={s.share}>{Math.round(share * 100)}%</span>
            </span>
          </>
        );
        return (
          <li key={step.label} className={s.step}>
            {kept !== null && (
              <span className={s.drop} data-bad={kept < 0.5}>
                {Math.round(kept * 100)}% continue · {Math.round((1 - kept) * 100)}% drop off
              </span>
            )}
            {step.url ? (
              <Link
                to={step.url}
                className={s.row}
                aria-label={`${step.label}: ${formatNumber(step.value)}. Open these bookings`}
              >
                {body}
                <ChevronRight size={16} aria-hidden className={s.chevron} />
              </Link>
            ) : (
              <div className={s.row}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
