import { GalleryHorizontalEnd } from 'lucide-react';
import * as styles from './PhotoCount.css';

/**
 * On a photo with more behind it, as in the app (src/shared/ui/PhotoCount.tsx): a card
 * sliding in from the side and how many there are, so it reads as "more to see".
 */
export function PhotoCount({ count, className }: { count: number; className?: string }) {
  return (
    <span className={`${styles.pill} ${className ?? ''}`} aria-label={`${count} photos`}>
      <GalleryHorizontalEnd size={13} strokeWidth={2.4} aria-hidden />
      <span aria-hidden>{count}</span>
    </span>
  );
}
