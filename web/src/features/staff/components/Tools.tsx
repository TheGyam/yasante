import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import type { Resource } from '../types';
import * as s from './Tools.css';
export function Tools({ models }: { models: Resource[] }) {
  const [search, setSearch] = useState('');
  const filtered = models.filter(model =>
    `${model.name} ${model.group}`.toLowerCase().includes(search.toLowerCase())
  );
  const groups = [...new Set(filtered.map(model => model.group))];
  return (
    <>
      <div className={s.stack}>
        <span className={s.eyebrow}>Everything within reach</span>
        <Text variant="display">A place for every detail.</Text>
        <Text tone="secondary">
          Browse records here. Open the editor for forms, relationships, history and advanced
          settings.
        </Text>
      </div>
      <Input
        label="Find a tool"
        type="search"
        placeholder="Search people, bookings, content…"
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
      <div className={s.tools}>
        {groups.map(group => (
          <section className={s.card} key={group}>
            <Text variant="title3">{group}</Text>
            {filtered
              .filter(model => model.group === group)
              .map(model => (
                <Link key={model.key} to={model.url} className={s.toolLink}>
                  {model.name}
                  <ArrowUpRight size={16} aria-hidden />
                </Link>
              ))}
          </section>
        ))}
      </div>
      {!groups.length && <EmptyState title="No tools match your search." body="" />}
    </>
  );
}
