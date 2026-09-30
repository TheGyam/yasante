import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Clock, CornerDownLeft, Search, type LucideIcon } from 'lucide-react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Kbd } from '@/shared/ui/Kbd';
import { useSearch } from '../../hooks';
import { iconFor } from '../../icons';
import type { NavItem } from '../../nav';
import { recentRecords } from '../../recent';
import * as s from './CommandPalette.css';

export interface PaletteAction {
  name: string;
  icon: LucideIcon;
  run: () => void;
  hint?: string;
}

interface Entry {
  id: string;
  name: string;
  subtitle?: string;
  icon: LucideIcon;
  url?: string;
  run?: () => void;
  count?: number;
}

const matches = (text: string, term: string) =>
  term
    .toLowerCase()
    .split(/\s+/)
    .every(word => text.toLowerCase().includes(word));

/**
 * Find anything: a page, a record, or something to do. Empty, it offers what you opened
 * last and what's waiting. Arrow keys move, Enter opens, ⌘/Ctrl+Enter opens in a new tab.
 */
export function CommandPalette({
  open,
  onClose,
  pages,
  waiting,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  pages: NavItem[];
  waiting: NavItem[];
  actions: PaletteAction[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [active, setActive] = useState(0);
  const search = useDebouncedValue(term, 150);
  const records = useSearch(open ? search : '');

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      setTerm('');
      setActive(0);
      node.showModal();
    }
    if (!open && node.open) node.close();
  }, [open]);

  const groups = useMemo((): { name: string; items: Entry[] }[] => {
    const trimmed = term.trim();
    if (!trimmed) {
      return [
        {
          name: 'Recent',
          items: recentRecords().map(item => ({
            id: item.url,
            name: item.name,
            subtitle: item.group,
            icon: Clock,
            url: item.url,
          })),
        },
        {
          name: 'Waiting for you',
          items: waiting.map(item => ({
            id: item.url,
            name: item.name,
            icon: item.icon,
            url: item.url,
            count: item.count,
          })),
        },
        {
          name: 'Go to',
          items: pages
            .slice(0, 6)
            .map(item => ({ id: item.url, name: item.name, icon: item.icon, url: item.url })),
        },
      ];
    }
    return [
      {
        name: 'Pages',
        items: pages
          .filter(item => matches(`${item.name} ${item.description ?? ''}`, trimmed))
          .slice(0, 6)
          .map(item => ({
            id: item.url,
            name: item.name,
            subtitle: item.description,
            icon: item.icon,
            url: item.url,
          })),
      },
      ...(records.data?.groups ?? []).map(group => ({
        name: group.name,
        items: group.items.map(item => ({
          id: item.url,
          name: item.name,
          subtitle: item.subtitle,
          icon: iconFor(item.icon),
          url: item.url,
        })),
      })),
      {
        name: 'Actions',
        items: actions
          .filter(item => matches(item.name, trimmed))
          .map(item => ({
            id: item.name,
            name: item.name,
            subtitle: item.hint,
            icon: item.icon,
            run: item.run,
          })),
      },
    ];
  }, [term, pages, waiting, actions, records.data]);

  const visible = groups.filter(group => group.items.length);
  const entries: Entry[] = visible.flatMap(group => group.items);
  const current = Math.min(active, Math.max(0, entries.length - 1));

  const choose = (entry: Entry, newTab = false) => {
    if (entry.url && newTab) {
      window.open(entry.url, '_blank', 'noopener');
      return;
    }
    onClose();
    if (entry.run) entry.run();
    else if (entry.url) navigate(entry.url);
  };

  let index = -1;
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-label="Search everything"
      onClose={onClose}
      onClick={event => event.target === event.currentTarget && onClose()}
    >
      <div className={s.box}>
        <div className={s.field}>
          <Search size={18} aria-hidden className={s.fieldIcon} />
          <input
            className={s.input}
            value={term}
            autoFocus
            placeholder="Search people, bookings, looks, or type a command…"
            aria-label="Search"
            role="combobox"
            aria-expanded
            aria-controls="palette-results"
            aria-activedescendant={entries[current] ? `palette-${current}` : undefined}
            onChange={event => {
              setTerm(event.target.value);
              setActive(0);
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const step = event.key === 'ArrowDown' ? 1 : -1;
                setActive((current + step + entries.length) % Math.max(1, entries.length));
              } else if (event.key === 'Enter' && entries[current]) {
                event.preventDefault();
                choose(entries[current], event.metaKey || event.ctrlKey);
              }
            }}
          />
          {records.isFetching && <span className={s.searching} aria-label="Searching" />}
        </div>
        <div id="palette-results" role="listbox" className={s.results}>
          {visible.map(group => (
            <div key={group.name} role="group" aria-label={group.name} className={s.group}>
              <div className={s.groupName}>{group.name}</div>
              {group.items.map(entry => {
                index += 1;
                const mine = index;
                const Icon = entry.icon;
                return (
                  <div
                    key={`${group.name}-${entry.id}`}
                    id={`palette-${mine}`}
                    role="option"
                    aria-selected={mine === current}
                    className={s.option}
                    onMouseMove={() => mine !== current && setActive(mine)}
                    onClick={event => choose(entry, event.metaKey || event.ctrlKey)}
                  >
                    <span className={s.optionIcon}>
                      <Icon size={16} aria-hidden />
                    </span>
                    <span className={s.optionText}>
                      <span className={s.optionName}>{entry.name}</span>
                      {entry.subtitle && <span className={s.optionSubtitle}>{entry.subtitle}</span>}
                    </span>
                    {entry.count ? <span className={s.optionCount}>{entry.count}</span> : null}
                    {mine === current && (
                      <ArrowRight size={14} aria-hidden className={s.optionArrow} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {!entries.length && (
            <p className={s.empty}>
              {term.trim().length > 1 && records.isFetching
                ? 'Searching…'
                : `Nothing matches “${term}”.`}
            </p>
          )}
        </div>
        <div className={s.footer}>
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
          </span>
          <span>
            <Kbd>
              <CornerDownLeft size={10} aria-label="Enter" />
            </Kbd>{' '}
            to open
          </span>
          <span>
            <Kbd>Esc</Kbd> to close
          </span>
        </div>
      </div>
    </dialog>
  );
}
