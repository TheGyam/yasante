import { useMemo, useRef } from 'react';
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
 *
 * The handlers keep their identity between renders, so a memoised card only
 * re-renders when its own look changes — one like never repaints the whole grid.
 */
export function useLookActions({
  onItsOwnPage = false,
  onNeedsAccount,
}: { onItsOwnPage?: boolean; onNeedsAccount?: () => void } = {}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  // `mutate` keeps its identity; the mutation object doesn't.
  const { mutate: like } = useToggleLike();
  const { data: styles = [] } = useStyleTaxonomy();
  // Read at call time, so an inline callback from the screen doesn't rebuild everything.
  const needsAccount = useRef(onNeedsAccount);
  needsAccount.current = onNeedsAccount;

  const styleNames = useMemo(
    () => Object.fromEntries(styles.map(style => [style.id, style.name])),
    [styles]
  );

  const handlers = useMemo(() => {
    const signedIn =
      <A extends unknown[]>(action: (...args: A) => void) =>
      (...args: A) => {
        if (isAuthenticated) return action(...args);
        if (needsAccount.current) needsAccount.current();
        else router.push('/auth/join');
      };

    return {
      onOpen: (look: Look) => router.push(`/looks/${look.id}`),
      onOpenPerson: (handle: string) => router.push(`/stylist/${handle}`),
      onFindStylists: (look: Look) =>
        look.styles[0] && router.push(`/who/${look.styles[0]}?look=${look.id}`),
      onLike: signedIn((look: Look, liked: boolean) => like({ id: look.id, liked })),
      // A look carries its own picture and caption, so the save screen needs only its id.
      onSave: signedIn((look: Look) => router.push(`/collections/save?kind=look&refId=${look.id}`)),
      onShare: (look: Look) => shareLook(look),
      onBook: signedIn((look: Look) =>
        router.push(`/book/${look.stylist!.handle}?service=${look.serviceId}&look=${look.id}`)
      ),
      onMore: signedIn((look: Look) =>
        router.push(
          `/looks/options?kind=look&id=${look.id}&name=${encodeURIComponent(look.authorName)}&authorId=${look.authorId}&mine=${look.mine ? 1 : 0}${onItsOwnPage ? '&leave=1' : ''}${look.reason ? `&why=${encodeURIComponent(look.reason)}` : ''}`
        )
      ),
    };
  }, [router, isAuthenticated, like, onItsOwnPage]);

  return useMemo(() => ({ styleNames, ...handlers }), [styleNames, handlers]);
}
