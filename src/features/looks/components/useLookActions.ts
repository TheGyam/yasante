import { useMemo } from 'react';
import { useRouter } from '@/shared/lib/navigation';
import { shareLook } from '../format';
import { useStyleTaxonomy, useToggleLike } from '../hooks';
import type { Look } from '../types';

/**
 * Everything a look card can do, wired the same way wherever a card appears. On
 * the look's own page, taking it down or blocking its author leaves that page too.
 */
export function useLookActions({ onItsOwnPage = false } = {}) {
  const router = useRouter();
  const like = useToggleLike();
  const { data: styles = [] } = useStyleTaxonomy();
  const styleNames = useMemo(
    () => Object.fromEntries(styles.map(style => [style.id, style.name])),
    [styles]
  );

  return {
    styleNames,
    onOpen: (look: Look) => router.push(`/looks/${look.id}`),
    onOpenPerson: (handle: string) => router.push(`/stylist/${handle}`),
    onLike: (look: Look, liked: boolean) => like.mutate({ id: look.id, liked }),
    // A look carries its own picture and caption, so the save screen needs only its id.
    onSave: (look: Look) => router.push(`/collections/save?kind=look&refId=${look.id}`),
    onShare: (look: Look) => shareLook(look),
    onBook: (look: Look) => router.push(`/book/${look.stylist!.handle}?service=${look.serviceId}`),
    onMore: (look: Look) =>
      router.push(
        `/looks/options?kind=look&id=${look.id}&name=${encodeURIComponent(look.authorName)}&authorId=${look.authorId}&mine=${look.mine ? 1 : 0}${onItsOwnPage ? '&leave=1' : ''}`
      ),
  };
}
