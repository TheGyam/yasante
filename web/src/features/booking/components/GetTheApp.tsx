import { Smartphone } from 'lucide-react';
import { STORE_LINKS } from '@/shared/lib/links';
import { Button } from '@/shared/ui/Button';
import { Glass } from '@/shared/ui/Glass';
import { Text } from '@/shared/ui/Text';
import icon from '@/shared/ui/app-icon.png';
import * as styles from './GetTheApp.css';

/**
 * Once the booking is in: what the app adds. Booking never needs it, so this is an
 * offer, not a gate. Until the app is in the stores, it offers the waitlist.
 */
export function GetTheApp() {
  const live = STORE_LINKS.appStore || STORE_LINKS.googlePlay;
  return (
    <Glass radius="lg" className={styles.card}>
      <img src={icon} alt="" className={styles.icon} />
      <div className={styles.text}>
        <Text variant="callout" as="h2">
          Get the Yasante app
        </Text>
        <Text variant="footnote" tone="secondary">
          A reminder before your appointment, and everything for your hair in between: your hair
          profile, your products, and a plan for your next style.
          {!live && ' It’s nearly here.'}
        </Text>
        <div className={styles.buttons}>
          {live ? (
            <>
              {STORE_LINKS.appStore && (
                <Button label="App Store" icon={Smartphone} size="sm" href={STORE_LINKS.appStore} />
              )}
              {STORE_LINKS.googlePlay && (
                <Button
                  label="Google Play"
                  icon={Smartphone}
                  size="sm"
                  variant="secondary"
                  href={STORE_LINKS.googlePlay}
                />
              )}
            </>
          ) : (
            <Button label="Tell me when it’s out" size="sm" variant="secondary" to="/#waitlist" />
          )}
        </div>
      </div>
    </Glass>
  );
}
