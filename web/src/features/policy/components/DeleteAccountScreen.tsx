import * as styles from './PolicyScreen.css';
import { Page } from '@/shared/ui/Page';
import { Text } from '@/shared/ui/Text';

/**
 * How to delete a Yasante account, reachable without the app (the Play Store asks for
 * a page like this). Deleting happens in the app; anyone without it can email us.
 */
export function DeleteAccountScreen() {
  return (
    <Page width="reading" title="Delete your account">
      <header className={styles.head}>
        <Text variant="display">Delete your Yasante account</Text>
        <Text variant="subhead" tone="secondary">
          You can delete your account at any time. It takes a minute.
        </Text>
      </header>
      <article className={styles.body}>
        <Text as="h2" variant="title3">
          In the Yasante app
        </Text>
        <Text as="p">
          Open Profile, then Settings, then Privacy and data, and tap Delete account. Confirm, and
          it’s done.
        </Text>
        <Text as="h2" variant="title3">
          Without the app
        </Text>
        <Text as="p">
          Email admin@yasante.com from the address you signed up with and ask us to delete your
          account. We’ll confirm by email and delete it within 30 days, usually much sooner.
        </Text>
        <Text as="h2" variant="title3">
          What’s deleted
        </Text>
        <Text as="p">
          Your account, profile, hair profile, collections, shelf, looks, comments, photos and saved
          items are deleted. If you’re a stylist, your page, menu and work photos go too.
        </Text>
        <Text as="h2" variant="title3">
          What’s kept, and for how long
        </Text>
        <Text as="p">
          A stylist keeps a record of appointments you had with them, with your name replaced by
          “Deleted account”. Reviews you left stay on the stylist’s page without your name. We may
          keep records we’re required to by law, and backups are cleared within 30 days.
        </Text>
      </article>
    </Page>
  );
}
