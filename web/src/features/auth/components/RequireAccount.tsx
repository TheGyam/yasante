import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSession } from '../session';

/** Signed in with a confirmed email, or off to the step that's missing. */
export function RequireAccount({ children }: { children: ReactNode }) {
  const session = useSession();
  if (!session) return <Navigate to="/auth/signup" replace />;
  if (!session.user.emailVerified) return <Navigate to="/auth/verify-email" replace />;
  return <>{children}</>;
}
