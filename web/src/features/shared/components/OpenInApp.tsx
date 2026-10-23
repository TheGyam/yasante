import { Smartphone } from 'lucide-react';
import { STORE_LINKS } from '@/shared/lib/links';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import * as styles from './Shared.css';

/**
 * Tagging along and making it yours happen in the app. Where it's installed, the link
 * opened it already; this is for everyone else.
 */
export function OpenInApp({ href }: { href: string }) {
  const live = STORE_LINKS.appStore || STORE_LINKS.googlePlay;
  return (
    <>
      <div className={styles.actions}>
        <Button label="Open in the app" icon={Smartphone} href={href} />
        {live ? (
          <>
            {STORE_LINKS.appStore && (
              <Button label="App Store" variant="secondary" href={STORE_LINKS.appStore} />
            )}
            {STORE_LINKS.googlePlay && (
              <Button label="Google Play" variant="secondary" href={STORE_LINKS.googlePlay} />
            )}
          </>
        ) : (
          <Button label="Tell me when it’s out" variant="secondary" to="/#waitlist" />
        )}
      </div>
      <Text variant="footnote" tone="secondary" as="p">
        In the Yasante app you can tag along, so it stays up to date in your Planner, or make it
        yours to change.
      </Text>
    </>
  );
}
