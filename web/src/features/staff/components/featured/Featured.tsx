import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { formatDate } from '../../format';
import { staffMessage, useFeaturedList } from '../../hooks';
import type { FeaturedSummary } from '../../types';
import * as controls from '../controls.css';
import * as ui from '../ui.css';
import { Details } from './Details';
import { StylistPage } from './StylistPage';
import * as s from './Featured.css';

export function featuredStatus(page: FeaturedSummary) {
  if (page.claimed_at) return `Claimed ${formatDate(page.claimed_at)}`;
  if (!page.look_count) return 'Needs photos';
  if (!page.agreed) return 'Waiting for their yes';
  return page.live ? `Live · ${page.waiting} on the waitlist` : 'Ready to go live';
}

export function Featured({ id, csrf }: { id?: string; csrf: string }) {
  if (id === 'new')
    return (
      <div className={ui.page}>
        <Link to="/featured">Featured stylists</Link>
        <Text variant="title1">Add a featured stylist</Text>
        <section className={ui.card}>
          <Details csrf={csrf} />
        </section>
      </div>
    );
  if (id) return <StylistPage id={id} csrf={csrf} />;
  return <FeaturedPages />;
}

function FeaturedPages() {
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const query = useFeaturedList(page);
  const data = query.data;
  const filter = term.trim().replace(/^@/, '').toLowerCase();
  const rows = data?.items.filter(item =>
    `${item.display_name} ${item.handle}`.toLowerCase().includes(filter)
  );
  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <Text variant="title1">Featured stylists</Text>
        <Button label="Add a featured stylist" icon={Plus} size="sm" to="/featured/new" />
      </header>
      <Input
        type="search"
        label="Search by name or handle"
        hint="Filters the current page."
        value={term}
        onChange={event => setTerm(event.target.value)}
      />
      {query.isError ? (
        <InlineAlert message={staffMessage(query.error)} />
      ) : !data ? (
        <Skeleton className={controls.loadingPanel} />
      ) : !data.count ? (
        <EmptyState
          icon={Users}
          title="No featured stylists yet."
          body="Add one once they've said yes."
        />
      ) : (
        <>
          <ul className={s.list}>
            {rows?.map(item => (
              <li key={item.id}>
                <Link className={`${s.person} ${ui.link}`} to={`/featured/${item.id}`}>
                  <RemoteImage
                    className={s.avatar}
                    src={item.avatar_uri}
                    alt={item.display_name}
                    aspect={1}
                  />
                  <div className={ui.grow}>
                    <Text variant="bodyStrong">{item.display_name}</Text>
                    <Text tone="secondary">
                      @{item.handle} · {item.base_area}
                    </Text>
                  </div>
                  <Text variant="footnote">{featuredStatus(item)}</Text>
                </Link>
              </li>
            ))}
          </ul>
          {!rows?.length && (
            <EmptyState
              title="No matches on this page"
              body="Try another name or handle, or check the next page."
            />
          )}
          <div className={ui.actions}>
            <Button
              label="Previous page"
              variant="secondary"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage(page - 1)}
            />
            <Text>
              Page {data.page} of {data.pages}
            </Text>
            <Button
              label="Next page"
              variant="secondary"
              disabled={page >= data.pages || query.isFetching}
              onClick={() => setPage(page + 1)}
            />
          </div>
        </>
      )}
    </div>
  );
}
