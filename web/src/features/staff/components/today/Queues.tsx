import { Bug, ChevronRight } from 'lucide-react';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { plural } from '../../format';
import type { Overview, Queue } from '../../types';
import * as ui from '../ui.css';
import * as s from './Queues.css';

/** Every review queue with its count; a clear one says so instead of showing a zero. */
export function Queues({ queues, errors }: { queues: Queue[]; errors: Overview['errors'] }) {
  return (
    <section className={ui.card} aria-labelledby="queues-title">
      <Text variant="title3" id="queues-title">
        Queues
      </Text>
      <ul className={s.list}>
        {queues.map(queue => (
          <li key={queue.key}>
            <Link to={queue.url} className={s.row}>
              <span className={`${s.name} ${ui.truncate}`}>{queue.label}</span>
              {queue.count ? (
                <span className={`${ui.count} ${ui.urgent}`}>{queue.count}</span>
              ) : (
                <span className={s.clear}>Clear</span>
              )}
              <ChevronRight size={14} aria-hidden className={s.chevron} />
            </Link>
          </li>
        ))}
        {(errors.open > 0 || errors.new > 0) && (
          <li>
            <Link to="/errors?status=open" className={s.row}>
              <span className={`${s.name} ${ui.truncate}`}>
                <Bug size={14} aria-hidden className={s.bug} /> Open errors
                {errors.new > 0 && (
                  <span className={s.newErrors}> · {plural(errors.new, 'new')}</span>
                )}
              </span>
              <span className={`${ui.count} ${errors.new ? ui.urgent : ''}`}>{errors.open}</span>
              <ChevronRight size={14} aria-hidden className={s.chevron} />
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}
