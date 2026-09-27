import { RequireAccount, SignedInAs, useSession } from '@/features/auth';
import { StylistSetupScreen } from '@/features/stylist';

/** Her page, set up or changed: signed in with a confirmed email first. */
export default function StylistSetupRoute() {
  const session = useSession();
  return (
    <RequireAccount>
      {session && (
        <>
          <SignedInAs />
          <StylistSetupScreen
            key={session.user.id}
            accountId={session.user.id}
            name={session.user.name}
          />
        </>
      )}
    </RequireAccount>
  );
}
