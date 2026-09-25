import { Heart } from 'lucide-react';
import { Link } from '@/shared/ui/Link';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { usePrefetchLook } from '../hooks';
import { lookAlt, lookTitle } from '../format';
import type { Look } from '../types';
import * as styles from './LookCard.css';

/** Portrait tiles, like the app's grid, so a feed reads as one even wall. */
export const TILE_ASPECT = 4 / 5;

export function LookCard({ look, priority }: { look: Look; priority?: boolean }) {
  const prefetch = usePrefetchLook();
  return (
    <Link to={`/looks/${look.id}`} className={styles.card} preload={() => prefetch(look.id)}>
      <RemoteImage
        src={look.thumbUri ?? look.feedUri ?? look.photoUri}
        alt={lookAlt(look)}
        aspect={TILE_ASPECT}
        priority={priority}
        className={styles.photo}
      />
      <span className={styles.shade} aria-hidden>
        <span className={styles.title}>{lookTitle(look)}</span>
        <span className={styles.meta}>
          {look.area}
          {look.likeCount > 0 && (
            <>
              {look.area && ' · '}
              <Heart size={12} strokeWidth={2.4} />
              {look.likeCount}
            </>
          )}
        </span>
      </span>
    </Link>
  );
}
