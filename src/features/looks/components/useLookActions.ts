import { useMemo } from 'react';
import { useAuth } from '@/features/auth';
import { useRouter } from '@/shared/lib/navigation';
import { shareLook } from '../format';
import { useStyleTaxonomy, useToggleLike } from '../hooks';
import type { Look } from '../types';

/**
 * Everything a look card can do, wired the same way wherever a card appears. On
 * the look's own page, taking it down or blocking its author leaves that page too.
 *
 * Anyone can look. Liking, saving, booking and reporting need an account; for a
 * guest they call `onNeedsAccount` — a friendly prompt — or open sign-up.
 */
export function useLookActions({
  onItsOwnPage = false,
  onNeedsAccount,
}: { onItsOwnPage?: boolean; onNeedsAccount?: () => void } = {}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  // `mutate` keeps its identity; the mutation object doesn't, and every card would
  // re-render on each like if the handler were built from it.
  const { mutate: like } = useToggleLike();
  const { data: styles = [] } = useStyleTaxonomy();
  const styleNames = useMemo(
    () => Object.fromEntries(styles.map(style => [style.id, style.name])),
    [styles]
  );

  const signedIn =
    <A extends unknown[]>(action: (...args: A) => void) =>
    (...args: A) => {
      if (isAuthenticated) return action(...args);
      if (onNeedsAccount) onNeedsAccount();
      else router.push('/auth/join');
    };

  return {
    styleNames,
    onOpen: (look: Look) => router.push(`/looks/${look.id}`),
    onOpenPerson: (handle: string) => router.push(`/stylist/${handle}`),
    onLike: signedIn((look: Look, liked: boolean) => like({ id: look.id, liked })),
    // A look carries its own picture and caption, so the save screen needs only its id.
    onSave: signedIn((look: Look) => router.push(`/collections/save?kind=look&refId=${look.id}`)),
    onShare: (look: Look) => shareLook(look),
    onBook: signedIn((look: Look) =>
      router.push(`/book/${look.stylist!.handle}?service=${look.serviceId}`)
    ),
    onMore: signedIn((look: Look) =>
      router.push(
        `/looks/options?kind=look&id=${look.id}&name=${encodeURIComponent(look.authorName)}&authorId=${look.authorId}&mine=${look.mine ? 1 : 0}${onItsOwnPage ? '&leave=1' : ''}`
      )
    ),
  };
}
