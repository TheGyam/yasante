import type { LucideIcon } from 'lucide-react';
import {
  CalendarCheck,
  CalendarDays,
  Images,
  LayoutList,
  NotebookPen,
  Search,
  Wallet,
} from 'lucide-react';
import { LookGrid } from '@/features/looks';
import { WaitlistForm } from '@/features/waitlist';
import { Button } from '@/shared/ui/Button';
import { Glass } from '@/shared/ui/Glass';
import { Page } from '@/shared/ui/Page';
import { Rise } from '@/shared/ui/Rise';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Text } from '@/shared/ui/Text';
import * as styles from './HomeScreen.css';

interface Point {
  icon: LucideIcon;
  title: string;
  body: string;
}

/** What the app does today, and nothing it doesn't. */
const FOR_CLIENTS: Point[] = [
  {
    icon: Search,
    title: 'Find it on hair like yours',
    body: 'A feed of real looks from real people. Filter by style, by hair like yours, or by area.',
  },
  {
    icon: CalendarCheck,
    title: 'Book the braider who did it',
    body: 'Pick a service, see the price and their free times, and send a request. Follow it from asked to done.',
  },
  {
    icon: NotebookPen,
    title: 'Look after it between appointments',
    body: 'Collections for the looks you’re saving up, and care plans that keep your routine on track.',
  },
];

const FOR_STYLISTS: Point[] = [
  {
    icon: LayoutList,
    title: 'A page that books',
    body: 'Your menu, prices, portfolio, hours and policies, at one link for your bio.',
  },
  {
    icon: Wallet,
    title: 'Requests, on your terms',
    body: 'Accept, move or decline. Deposits are paid straight to you — Yasante never handles them.',
  },
  {
    icon: CalendarDays,
    title: 'Your week at a glance',
    body: 'Reminders for both of you, and a nudge to post the result after each appointment.',
  },
];

function Points({ points }: { points: Point[] }) {
  return (
    <ul className={styles.points}>
      {points.map(({ icon: Icon, title, body }) => (
        <li key={title} className={styles.point}>
          <span className={styles.icon}>
            <Icon size={18} strokeWidth={2.1} aria-hidden />
          </span>
          <span className={styles.pointText}>
            <Text variant="bodyStrong">{title}</Text>
            <Text variant="subhead" tone="secondary">
              {body}
            </Text>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HomeScreen({ source }: { source?: string }) {
  return (
    <Page>
      <Rise className={styles.hero}>
        <Text variant="display">Braids by someone whose work you’ve seen.</Text>
        <Text variant="body" tone="secondary" className={styles.lede}>
          Real looks on real hair, from braiders near you. Book the one you like, in the app.
        </Text>
        <div className={styles.actions}>
          <Button label="Join the waitlist" href="#waitlist" />
          <Button label="See the looks" variant="secondary" icon={Images} to="/looks" />
        </div>
      </Rise>

      <LookGrid filters={{}} limit={8} />

      <SectionHeader title="Two sides, one app" />
      <div className={styles.sides}>
        <Glass padded radius="xl" className={styles.side}>
          <Text variant="overline" tone="accent" as="h3">
            If you’re getting your hair done
          </Text>
          <Points points={FOR_CLIENTS} />
        </Glass>
        <Glass padded radius="xl" className={styles.side}>
          <Text variant="overline" tone="accent" as="h3">
            If you’re a stylist
          </Text>
          <Points points={FOR_STYLISTS} />
          <div>
            <Button label="Set up your page" size="md" to="/auth/signup" />
          </div>
        </Glass>
      </div>

      <section id="waitlist" className={styles.join} aria-labelledby="waitlist-title">
        <div className={styles.joinText}>
          <Text variant="title1" as="h2" id="waitlist-title">
            Be first when it opens near you
          </Text>
          <Text variant="body" tone="secondary">
            Leave your email and we’ll tell you when Yasante is in your app store and your area.
          </Text>
        </div>
        <Glass padded radius="xl">
          <WaitlistForm source={source} />
        </Glass>
      </section>
    </Page>
  );
}
