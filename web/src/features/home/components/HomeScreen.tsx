import { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  LayoutList,
  NotebookPen,
  Search,
  Wallet,
} from 'lucide-react';
import { LookGrid } from '@/features/looks';
import { WaitlistForm } from '@/features/waitlist';
import { Link } from '@/shared/ui/Link';
import { Page } from '@/shared/ui/Page';
import { FilmDialog, type FilmDialogHandle } from './FilmDialog';
import { Hero } from './Hero';
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
            <strong className={styles.pointTitle}>{title}</strong>
            <span className={styles.pointBody}>{body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HomeScreen({ source }: { source?: string }) {
  const film = useRef<FilmDialogHandle>(null);
  return (
    <>
      <Hero onWatch={() => film.current?.open()} />
      <FilmDialog ref={film} />

      <Page>
        <section className={styles.block} aria-labelledby="looks-title">
          <div className={styles.head}>
            <div>
              <p className={styles.overline}>Real looks, real hair</p>
              <h2 id="looks-title" className={styles.big}>
                On hair <span className={styles.silk}>like yours.</span>
              </h2>
            </div>
            <Link to="/looks" className={styles.pill}>
              See all looks
              <ArrowRight size={16} strokeWidth={2.4} aria-hidden />
            </Link>
          </div>
          <LookGrid filters={{}} limit={8} />
        </section>

        <section className={styles.block} aria-labelledby="sides-title">
          <div className={styles.head}>
            <div>
              <p className={styles.overline}>Two sides, one app</p>
              <h2 id="sides-title" className={styles.big}>
                Get it done. <span className={styles.silk}>Or do it.</span>
              </h2>
            </div>
          </div>
          <div className={styles.sides}>
            <div className={styles.panel}>
              <p className={styles.panelKicker}>If you’re getting your hair done</p>
              <Points points={FOR_CLIENTS} />
            </div>
            <div className={styles.panel}>
              <p className={styles.panelKicker}>If you’re a stylist</p>
              <Points points={FOR_STYLISTS} />
              <Link to="/auth/signup" className={styles.light}>
                Set up your page
                <ArrowRight size={16} strokeWidth={2.4} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <section id="waitlist" className={styles.join} aria-labelledby="waitlist-title">
          <div className={styles.joinText}>
            <p className={styles.overline}>Coming to your app store</p>
            <h2 id="waitlist-title" className={styles.big}>
              Be first <span className={styles.silk}>in.</span>
            </h2>
            <p className={styles.joinBody}>
              Leave your email and we’ll tell you when Yasante is in your app store and your area.
            </p>
          </div>
          <div className={styles.form}>
            <WaitlistForm source={source} />
          </div>
        </section>
      </Page>
    </>
  );
}
