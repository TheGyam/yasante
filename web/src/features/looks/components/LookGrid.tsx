import { ImageOff } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { useOnVisible } from '@/shared/hooks/useOnVisible';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useLooks } from '../hooks';
import type { LookFilters } from '../types';
import { LookCard, TILE_ASPECT } from './LookCard';
import styles from './LookGrid.module.css';

export interface LookGridProps {
  filters: LookFilters;
  /** Stop after the first page: a taste, not the whole feed. */
  limit?: number;
  /** Leave one out, such as the look this grid sits under. */
  exclude?: string;
  empty?: { title: string; body?: string };
}

/**
 * A wall of looks, loading the next page as the reader nears the end. Only the first
 * page's photos load eagerly; everything else waits until it's near the screen.
 */
export function LookGrid({ filters, limit, exclude, empty }: LookGridProps) {
  const query = useLooks(filters, limit);
  const { data, isPending, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const paging = limit === undefined;
  const sentinel = useOnVisible<HTMLDivElement>(
    () => void fetchNextPage(),
    paging && !!hasNextPage && !isFetchingNextPage && !isError
  );

  if (isPending) {
    return (
      <ul className={styles.grid} aria-busy>
        {Array.from({ length: Math.min(limit ?? 8, 8) }, (_, i) => (
          <li key={i}>
            <Skeleton style={{ aspectRatio: String(TILE_ASPECT), borderRadius: 14 }} />
          </li>
        ))}
      </ul>
    );
  }

  const looks = (data?.pages.flatMap(page => page.data) ?? []).filter(look => look.id !== exclude);

  if (isError && !looks.length) {
    return (
      <EmptyState
        icon={ImageOff}
        title="Couldn’t load looks"
        body={errorMessage(error, 'Please try again in a moment.')}
        action={
          <Button label="Try again" variant="secondary" size="md" onClick={() => query.refetch()} />
        }
      />
    );
  }

  if (!looks.length) {
    return empty ? <EmptyState icon={ImageOff} title={empty.title} body={empty.body} /> : null;
  }

  return (
    <>
      <ul className={styles.grid}>
        {looks.map((look, index) => (
          <li key={look.id}>
            <LookCard look={look} priority={index < 4} />
          </li>
        ))}
      </ul>
      {paging && (hasNextPage || isError) && (
        <div ref={sentinel} className={styles.more}>
          {isError ? (
            <>
              <InlineAlert message={errorMessage(error, 'Couldn’t load more looks.')} />
              <Button
                label="Try again"
                variant="secondary"
                size="md"
                onClick={() => fetchNextPage()}
              />
            </>
          ) : (
            <Button
              label="Show more"
              variant="secondary"
              size="md"
              loading={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            />
          )}
        </div>
      )}
    </>
  );
}
