import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { flushConsents } from '../consents';
import { useSession } from '../session';

/** Signed in with a confirmed email, or off to the step that's missing. */
export function RequireAccount({ children }: { children: ReactNode }) {
  const session = useSession();
  const accountId = session?.user.id;
  // Consents from sign-up that didn't reach the server yet.
  useEffect(() => {
    if (accountId) void flushConsents(accountId);
  }, [accountId]);
  if (!session) return <Navigate to="/auth/signup" replace />;
  if (!session.user.emailVerified) return <Navigate to="/auth/verify-email" replace />;
  return <>{children}</>;
}
