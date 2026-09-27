import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Plus } from 'lucide-react';
import { useMyProfile, useSummary } from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NavLink } from '@/shared/ui/Link';
import { Page } from '@/shared/ui/Page';
import { Skeleton } from '@/shared/ui/Skeleton';
import * as styles from './StudioLayout.css';

/**
 * A stylist's studio: the app's four stylist tabs (and her menu), on the web until the
 * app is in the stores. Everything here is hers alone, behind her sign-in.
 */
export function StudioLayout({ accountId, children }: { accountId: string; children: ReactNode }) {
  const profile = useMyProfile(accountId);
  const summary = useSummary(accountId);

  if (profile.isPending) {
    return (
      <Page>
        <Skeleton style={{ height: 40, width: '50%' }} />
      </Page>
    );
  }
  if (profile.isError) {
    return (
      <Page title="Your studio">
        <EmptyState
          as="h1"
          title="Couldn’t load your studio"
          body={errorMessage(profile.error, 'Please try again in a moment.')}
          action={
            <Button
              label="Try again"
              variant="secondary"
              size="md"
              onClick={() => profile.refetch()}
            />
          }
        />
      </Page>
    );
  }
  // No page yet: setting one up comes first.
  if (!profile.data) return <Navigate to="/stylist-setup" replace />;

  const waiting = summary.data?.pendingRequests ?? 0;
  return (
    <>
      <div className={styles.bar}>
        <nav className={styles.tabs} aria-label="Your studio">
          <NavLink to="/today" className={styles.tab}>
            Today
          </NavLink>
          <NavLink to="/requests" className={styles.tab}>
            Requests
            {waiting > 0 && (
              <span className={styles.badge} aria-label={`${waiting} waiting`}>
                {waiting}
              </span>
            )}
          </NavLink>
          <NavLink to="/portfolio" className={styles.tab}>
            Your work
          </NavLink>
          <NavLink to="/menu" className={styles.tab}>
            Menu
          </NavLink>
          <NavLink to="/account" className={styles.tab}>
            Account
          </NavLink>
        </nav>
        <Button label="Post" icon={Plus} size="sm" to="/looks/new" />
      </div>
      {children}
    </>
  );
}
