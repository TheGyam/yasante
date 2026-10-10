import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { flushConsents } from '../consents';
import { withNext } from '../rules';
import { useSession } from '../session';

/**
 * Signed in with a confirmed email, or off to the step that's missing. A client's page
 * (`client`) sends her to sign in and brings her back; the studio, to stylist sign-up.
 */
export function RequireAccount({ children, client }: { children: ReactNode; client?: boolean }) {
  const session = useSession();
  const { pathname, search } = useLocation();
  const here = client ? pathname + search : undefined;
  const accountId = session?.user.id;
  // Consents from sign-up that didn't reach the server yet.
  useEffect(() => {
    if (accountId) void flushConsents(accountId);
  }, [accountId]);
  if (!session)
    return <Navigate to={here ? withNext('/auth/login', here) : '/auth/signup'} replace />;
  if (!session.user.emailVerified)
    return <Navigate to={withNext('/auth/verify-email', here)} replace />;
  return <>{children}</>;
}
