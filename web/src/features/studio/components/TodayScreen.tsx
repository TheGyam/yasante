import { useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  Check,
  ClipboardCheck,
  Copy,
  ExternalLink,
  ImagePlus,
  Scissors,
  Store,
  Wallet,
} from 'lucide-react';
import { useBookings, whenLabel, type Booking } from '@/features/booking';
import { useMyLooks } from '@/features/looks';
import { useMenu, useMyProfile, useNumbers, type StylistProfile } from '@/features/stylist';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import * as styles from './Studio.css';

/** Enough looks that someone browsing her style sees a body of work, not a one-off. */
const LOOKS_GOAL = 9;

const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/** Her page, what's left to do before clients arrive, her week and her appointments. */
export function TodayScreen({ accountId }: { accountId: string }) {
  const { data: profile } = useMyProfile(accountId);
  const { data: menu } = useMenu(accountId);
  const { data: looks } = useMyLooks();
  const { data: numbers } = useNumbers(accountId);
  const { data: confirmed = [] } = useBookings(['confirmed']);
  if (!profile) return null;

  const now = new Date();
  const due = (b: Booking) =>
    !!b.scheduledFor &&
    (new Date(b.scheduledFor).toDateString() === now.toDateString() ||
      new Date(b.scheduledFor) < now);
  const todays = confirmed.filter(due);
  const later = confirmed.filter(b => b.scheduledFor && !due(b));

  return (
    <Page title="Today">
      <div className={styles.head}>
        <Text variant="title1">Today</Text>
        <Text variant="subhead" tone="secondary">
          {today.format(now)}
        </Text>
      </div>
      <div className={styles.columns}>
        <div>
          <PageCard profile={profile} />
          <Checklist
            profile={profile}
            services={menu?.length}
            looks={looks?.filter(l => l.visibility === 'public').length}
          />
        </div>
        <div>
          {numbers && (
            <Glass padded radius="xl" className={styles.card}>
              <Text variant="overline" tone="tertiary" as="h2">
                This week
              </Text>
              <div className={styles.stats}>
                {[
                  [numbers.thisWeek.views, 'page views'],
                  [numbers.thisWeek.requests, 'requests'],
                  [numbers.thisWeek.confirmed, 'confirmed'],
                ].map(([value, label]) => (
                  <div key={label} className={styles.stat}>
                    <Text variant="title2" tabular as="span">
                      {value}
                    </Text>
                    <Text variant="footnote" tone="secondary">
                      {label}
                    </Text>
                  </div>
                ))}
              </div>
            </Glass>
          )}
          {todays.length ? (
            <Section
              title="Appointments"
              footer="Close one out when your client leaves — it keeps your numbers honest."
            >
              {todays.map(b => (
                <ListRow
                  key={b.id}
                  icon={new Date(b.scheduledFor!) <= now ? ClipboardCheck : CalendarClock}
                  title={`${b.clientName} · ${b.serviceName}`}
                  subtitle={`${whenLabel(b.scheduledFor!)} · ${
                    new Date(b.scheduledFor!) <= now
                      ? 'Close it out when they leave'
                      : b.attendanceConfirmedAt
                        ? 'Said they’re coming'
                        : 'Not confirmed yet'
                  }`}
                  to={`/requests/${b.id}`}
                />
              ))}
            </Section>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="Nothing booked today"
              body="Confirmed bookings show up here with the time and what the client asked for."
            />
          )}
          {later.length > 0 && (
            <Section title="Coming up">
              {later.map(b => (
                <ListRow
                  key={b.id}
                  icon={CalendarDays}
                  title={`${b.clientName} · ${b.serviceName}`}
                  subtitle={whenLabel(b.scheduledFor!)}
                  to={`/requests/${b.id}`}
                />
              ))}
            </Section>
          )}
        </div>
      </div>
    </Page>
  );
}

function PageCard({ profile }: { profile: StylistProfile }) {
  const [copied, setCopied] = useState(false);
  const url = `https://yasante.com/${profile.handle}`;
  if (!profile.published) {
    return (
      <Section footer="Only you can see it until it’s live.">
        <ListRow
          icon={Store}
          title="Your page is still a draft"
          subtitle="Finish setting it up to go live"
          to="/stylist-setup"
        />
      </Section>
    );
  }
  return (
    <Glass padded radius="xl" className={styles.card}>
      <Text variant="overline" tone="tertiary" as="h2">
        Your page
      </Text>
      <Text variant="title3" as="p">
        yasante.com/{profile.handle}
      </Text>
      <Text variant="footnote" tone="secondary">
        Put it in your bio: it’s the link clients book you from.
      </Text>
      <div className={styles.link}>
        <Button
          label={copied ? 'Copied' : 'Copy link'}
          icon={copied ? Check : Copy}
          size="sm"
          variant="secondary"
          onClick={() =>
            navigator.clipboard?.writeText(url).then(
              () => setCopied(true),
              () => setCopied(false)
            )
          }
        />
        <Button
          label="See your page"
          icon={ExternalLink}
          size="sm"
          variant="ghost"
          to={`/${profile.handle}`}
        />
      </div>
    </Glass>
  );
}

/**
 * What stands between her and her first booking, from what's really on her page. Each
 * step disappears once it's done; the whole list goes when everything is.
 */
function Checklist({
  profile,
  services,
  looks,
}: {
  profile: StylistProfile;
  services?: number;
  looks?: number;
}) {
  const takesDeposits = profile.policies.depositType !== 'none';
  const hasHours = !!profile.availability?.week?.some(Boolean);
  const steps = [
    {
      done: profile.published,
      title: 'Put your page live',
      subtitle: 'Clients can’t find a draft',
      to: '/stylist-setup',
      icon: Store,
    },
    {
      done: !!services,
      title: 'Add your services and prices',
      subtitle: 'Clients pick one when they ask for an appointment',
      to: '/menu/new',
      icon: Scissors,
    },
    {
      done: hasHours,
      title: 'Set your working hours',
      subtitle: 'Clients only see times inside them',
      to: '/availability',
      icon: CalendarDays,
    },
    {
      done: !takesDeposits || !!profile.paymentMethods?.length,
      title: 'Add how you’re paid',
      subtitle: 'You take deposits, so clients need somewhere to send them',
      to: '/payment-methods',
      icon: Wallet,
    },
    {
      done: (looks ?? 0) >= LOOKS_GOAL,
      title: looks ? `Post more of your work (${looks} of ${LOOKS_GOAL})` : 'Post your work',
      subtitle: 'Clients find stylists through their looks in the feed',
      to: '/looks/new',
      icon: ImagePlus,
    },
  ];
  // Until the counts arrive, nothing is claimed as done or not.
  if (services === undefined || looks === undefined) return null;
  const left = steps.filter(s => !s.done);
  if (!left.length) return null;
  return (
    <Section
      title={`Get ready for clients · ${steps.length - left.length} of ${steps.length} done`}
    >
      {left.map(step => (
        <ListRow
          key={step.title}
          icon={step.icon}
          title={step.title}
          subtitle={step.subtitle}
          to={step.to}
        />
      ))}
    </Section>
  );
}
