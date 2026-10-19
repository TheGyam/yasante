import { Text } from '@/shared/ui/Text';
import { useSignOut } from '../hooks';
import { useSession } from '../session';
import * as styles from './AuthLayout.css';
import { SEP } from '@/shared/lib/format';

/** Who's signed in on this tab, with a way out: this may be a shared computer. */
export function SignedInAs() {
  const session = useSession();
  const signOut = useSignOut();
  if (!session) return null;
  return (
    <Text variant="footnote" tone="tertiary" as="p" className={styles.signedIn}>
      Signed in as {session.user.email}
      {SEP}
      <button
        type="button"
        className={styles.linkButton}
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
      >
        Sign out
      </button>
    </Text>
  );
}
