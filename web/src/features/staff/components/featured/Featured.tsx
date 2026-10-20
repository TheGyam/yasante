import { useState } from 'react';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
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

/** Where a page has got to, in the words staff use. */
export function featuredStatus(page: FeaturedSummary) {
  if (page.claimed_at) return `Claimed ${formatDate(page.claimed_at)}`;
  if (!page.look_count) return 'Needs photos';
  if (!page.agreed) return 'Waiting for their yes';
  return page.live ? `Live · ${page.waiting} on the waitlist` : 'Ready to go live';
}

/** The four steps every page goes through, in order. */
export function steps(page: FeaturedSummary) {
  return [
    { name: 'Looks', done: page.look_count > 0 },
    { name: 'Their yes', done: page.agreed },
    { name: 'Live', done: page.live },
    { name: 'Theirs', done: !!page.claimed_at },
  ];
}

export function Avatar({ page, large }: { page: FeaturedSummary; large?: boolean }) {
  return (
    <span className={`${s.avatar} ${large ? s.avatarLarge : ''}`} aria-hidden>
      {page.avatar_uri ? (
        <img className={s.avatarImage} src={page.avatar_uri} alt="" />
      ) : (
        page.display_name.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function Progress({ page }: { page: FeaturedSummary }) {
  const all = steps(page);
  return (
    <div
      className={s.progress}
      role="img"
      aria-label={`${all.filter(step => step.done).length} of 4 steps done`}
    >
      {all.map(step => (
        <span key={step.name} className={s.segment} data-done={step.done} title={step.name} />
      ))}
    </div>
  );
}

export function Featured({ id, csrf }: { id?: string; csrf: string }) {
  if (id === 'new')
    return (
      <div className={s.narrow}>
        <Link className={s.back} to="/featured">
          <ArrowLeft size={14} aria-hidden /> Featured stylists
        </Link>
        <div className={ui.heading}>
          <Text variant="title1">Add a featured stylist</Text>
          <Text tone="secondary">
            Start with where they post: Instagram, TikTok or both. You'll add their looks and their
            yes next.
          </Text>
        </div>
        <section className={s.section}>
          <Details csrf={csrf} />
        </section>
      </div>
    );
  if (id) return <StylistPage id={id} csrf={csrf} />;
  return <FeaturedPages />;
}

const STAGES = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'todo', label: 'To do', test: (p: FeaturedSummary) => !p.live && !p.claimed_at },
  { key: 'live', label: 'Live', test: (p: FeaturedSummary) => p.live && !p.claimed_at },
  { key: 'claimed', label: 'Theirs now', test: (p: FeaturedSummary) => !!p.claimed_at },
] as const;

function FeaturedPages() {
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [stage, setStage] = useState<(typeof STAGES)[number]['key']>('all');
  const query = useFeaturedList(page);
  const data = query.data;
  const filter = term.trim().replace(/^@/, '').toLowerCase();
  const chosen = STAGES.find(item => item.key === stage)!;
  const rows = data?.items.filter(
    item =>
      chosen.test(item) && `${item.display_name} ${item.handle}`.toLowerCase().includes(filter)
  );
  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div className={ui.heading}>
          <Text variant="title1">Featured stylists</Text>
          <Text className={s.intro}>
            Pages we build for stylists who've said yes. They can make them theirs any time.
          </Text>
        </div>
        <Button label="Add a featured stylist" icon={Plus} size="sm" to="/featured/new" />
      </header>
      {!!data?.count && (
        <div className={s.toolbar}>
          <div className={s.stages} role="group" aria-label="Show">
            {STAGES.map(item => (
              <button
                key={item.key}
                type="button"
                className={s.stage}
                aria-pressed={stage === item.key}
                onClick={() => setStage(item.key)}
              >
                {item.label}
                <span className={ui.count}>{data.items.filter(item.test).length}</span>
              </button>
            ))}
          </div>
          <div className={s.search}>
            <Input
              type="search"
              label="Search by name or handle"
              value={term}
              onChange={event => setTerm(event.target.value)}
            />
          </div>
        </div>
      )}
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
          {rows?.length ? (
            <ul className={s.cards}>
              {rows.map(item => (
                <li key={item.id}>
                  <Link className={s.card} to={`/featured/${item.id}`}>
                    <div className={s.strip} aria-hidden>
                      {[0, 1, 2].map(i =>
                        item.covers?.[i] ? (
                          <img key={i} className={s.stripImage} src={item.covers[i]} alt="" />
                        ) : (
                          <span key={i} className={s.stripImage} />
                        )
                      )}
                    </div>
                    <div className={s.who}>
                      <Avatar page={item} />
                      <div className={ui.grow}>
                        <div className={`${s.name} ${ui.truncate}`}>{item.display_name}</div>
                        <div className={`${s.sub} ${ui.truncate}`}>
                          @{item.handle} · {item.base_area}
                        </div>
                      </div>
                    </div>
                    <Progress page={item} />
                    <div className={s.next}>
                      <span className={s.nextText}>{featuredStatus(item)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No one here" body="Try another name, or show everyone." />
          )}
          {data.pages > 1 && (
            <div className={s.pager}>
              <Button
                label="Previous page"
                variant="secondary"
                size="sm"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage(page - 1)}
              />
              <span>
                Page {data.page} of {data.pages}
              </span>
              <Button
                label="Next page"
                variant="secondary"
                size="sm"
                disabled={page >= data.pages || query.isFetching}
                onClick={() => setPage(page + 1)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
