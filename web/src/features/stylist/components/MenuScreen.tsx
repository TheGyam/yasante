import { ListPlus, Scissors } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useMenu, useMyCurrency } from '../hooks';
import { formatPrice, serviceDetails } from '../format';
import * as styles from './StudioScreens.css';

/** Her services and prices: what clients choose from when they ask. */
export function MenuScreen({ accountId }: { accountId: string }) {
  const currency = useMyCurrency(accountId);
  const menu = useMenu(accountId);
  return (
    <Page title="Your menu">
      <div className={styles.head}>
        <div>
          <Text variant="title1">Your menu</Text>
          <Text variant="subhead" tone="secondary">
            What clients choose from. Prices are yours, and what they’re quoted.
          </Text>
        </div>
        {!!menu.data?.length && (
          <Button label="Add a service" icon={ListPlus} size="md" to="/menu/new" />
        )}
      </div>
      {menu.isPending ? (
        <Skeleton style={{ height: 200, borderRadius: 20 }} />
      ) : menu.isError ? (
        <EmptyState
          title="Couldn’t load your menu"
          body={errorMessage(menu.error, 'Please try again in a moment.')}
          action={
            <Button
              label="Try again"
              variant="secondary"
              size="md"
              onClick={() => menu.refetch()}
            />
          }
        />
      ) : !menu.data.length ? (
        <EmptyState
          icon={Scissors}
          title="No services yet"
          body="Add what you do and what it costs. Clients can’t ask for an appointment until there’s something to pick."
          action={<Button label="Add your first service" icon={ListPlus} to="/menu/new" />}
        />
      ) : (
        <Section>
          {menu.data.map(item => (
            <ListRow
              key={item.id}
              icon={Scissors}
              title={item.name}
              subtitle={serviceDetails(item)}
              value={formatPrice(item, currency)}
              to={`/menu/${item.id}`}
            />
          ))}
        </Section>
      )}
    </Page>
  );
}
