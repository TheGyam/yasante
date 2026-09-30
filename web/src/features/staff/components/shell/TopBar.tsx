import { ChevronRight, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Kbd } from '@/shared/ui/Kbd';
import { Menu } from '@/shared/ui/Menu';
import type { Resource } from '../../types';
import * as s from './TopBar.css';

// The things the team creates most, first in the New menu.
const COMMON = ['accounts.invite', 'content.tip', 'looks.style', 'content.contentitem'];

/** Where you are, a way to find anything, and a way to make something new. */
export function TopBar({
  crumbs,
  models,
  refreshing,
  onRefresh,
  onSearch,
}: {
  crumbs: string[];
  models: Resource[];
  refreshing: boolean;
  onRefresh: () => void;
  onSearch: () => void;
}) {
  const addable = models
    .filter(model => model.addUrl)
    .sort((a, b) => {
      const rank = (model: Resource) =>
        COMMON.includes(model.key) ? COMMON.indexOf(model.key) : 99;
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className={s.bar}>
      <nav aria-label="Breadcrumb" className={s.crumbs}>
        <ol className={s.list}>
          {crumbs.map((crumb, index) => (
            <li
              key={index}
              className={s.crumb}
              aria-current={index === crumbs.length - 1 ? 'page' : undefined}
            >
              {index > 0 && <ChevronRight size={14} className={s.separator} aria-hidden />}
              <span className={s.crumbText}>{crumb}</span>
            </li>
          ))}
        </ol>
      </nav>
      <button type="button" className={s.search} onClick={onSearch} aria-label="Search everything">
        <Search size={16} aria-hidden />
        <span className={s.placeholder}>Search people, bookings, looks…</span>
        <Kbd>{mac ? '⌘K' : 'Ctrl K'}</Kbd>
      </button>
      <div className={s.actions}>
        <Button
          label=""
          aria-label="Refresh"
          title="Refresh"
          icon={RefreshCw}
          variant="quiet"
          size="sm"
          className={`${s.iconButton} ${refreshing ? s.spinning : ''}`}
          onClick={onRefresh}
        />
        {addable.length > 0 && (
          <Menu
            label="New"
            icon={Plus}
            variant="primary"
            align="end"
            items={addable.map(model => ({
              label: model.singular.charAt(0).toUpperCase() + model.singular.slice(1),
              to: model.addUrl!,
            }))}
          />
        )}
      </div>
    </header>
  );
}
