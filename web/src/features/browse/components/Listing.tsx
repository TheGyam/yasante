import { SearchX } from 'lucide-react';
import { LookGrid, looksHref, type LookFilters } from '@/features/looks';
import { StylistRow, useStylistSearch, type StylistFilters } from '@/features/stylist';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { Page } from '@/shared/ui/Page';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Text } from '@/shared/ui/Text';
import styles from './Listing.module.css';

export interface ListingProps {
  title: string;
  intro: string;
  looks: LookFilters;
  stylists: StylistFilters;
}

/**
 * A style or an area: the braiders who do it and the work itself. These are the pages
 * people land on from search, so they lead with what they asked for.
 */
export function Listing({ title, intro, looks, stylists }: ListingProps) {
  const { data: found } = useStylistSearch(stylists);
  return (
    <Page title={title} description={intro}>
      <div className={styles.intro}>
        <Text variant="display">{title}</Text>
        <Text variant="body" tone="secondary">
          {intro}
        </Text>
      </div>

      {!!found?.length && (
        <>
          <SectionHeader title="Braiders" />
          <Glass radius="lg" style={{ overflow: 'hidden' }}>
            {found.slice(0, 20).map(stylist => (
              <StylistRow key={stylist.accountId} stylist={stylist} />
            ))}
          </Glass>
        </>
      )}

      <SectionHeader title="Looks" action={{ label: 'See all', to: looksHref(looks) }} />
      <LookGrid
        filters={looks}
        limit={24}
        empty={{ title: 'No looks here yet', body: 'When someone posts one, it’ll show here.' }}
      />
    </Page>
  );
}

export function NothingHere({ what }: { what: string }) {
  return (
    <Page title="Not found">
      <EmptyState
        as="h1"
        icon={SearchX}
        title={`We don’t have ${what} yet`}
        body="Have a look through everything on Yasante instead."
        action={<Button label="See looks" variant="secondary" size="md" to="/looks" />}
      />
    </Page>
  );
}
