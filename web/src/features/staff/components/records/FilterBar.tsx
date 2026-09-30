import { useState } from 'react';
import { Check, ListFilter, Search, X } from 'lucide-react';
import { Popover } from '@/shared/ui/Popover';
import type { Records } from '../../types';
import * as s from './FilterBar.css';

const fromQuery = (query: string) => new URLSearchParams(query.replace(/^\?/, ''));

/**
 * Search, one Filter button and the filters in force as chips. Each filter group is the
 * admin's own list filter, so what's offered is exactly what the server accepts.
 */
export function FilterBar({
  data,
  params,
  apply,
}: {
  data: Records;
  params: URLSearchParams;
  apply: (next: URLSearchParams) => void;
}) {
  const [term, setTerm] = useState(params.get('q') ?? '');
  const active = data.filters
    .map(filter => ({ filter, choice: filter.choices.find(choice => choice.selected) }))
    .filter(({ filter, choice }) => choice && choice !== filter.choices[0]);
  return (
    <div className={s.bar}>
      <div className={s.controls}>
        {data.searchable && (
          <form
            role="search"
            className={s.search}
            onSubmit={event => {
              event.preventDefault();
              const next = new URLSearchParams(params);
              if (term.trim()) next.set('q', term.trim());
              else next.delete('q');
              next.delete('p');
              apply(next);
            }}
          >
            <Search size={16} aria-hidden className={s.searchIcon} />
            <input
              type="search"
              value={term}
              maxLength={200}
              onChange={event => setTerm(event.target.value)}
              placeholder={`Search ${data.name.toLowerCase()}`}
              aria-label={`Search ${data.name.toLowerCase()}`}
              className={s.input}
            />
          </form>
        )}
        {data.filters.length > 0 && (
          <Popover
            label="Filter"
            icon={ListFilter}
            variant="secondary"
            badge={active.length ? <span className={s.badge}>{active.length}</span> : undefined}
          >
            {close => (
              <div className={s.panel}>
                {data.filters.map(filter => (
                  <fieldset key={filter.label} className={s.group}>
                    <legend className={s.legend}>{filter.label}</legend>
                    <div className={s.options}>
                      {filter.choices.map(choice => (
                        <button
                          key={choice.query}
                          type="button"
                          className={s.option}
                          aria-pressed={choice.selected}
                          onClick={() => {
                            apply(fromQuery(choice.query));
                            close();
                          }}
                        >
                          {choice.selected && <Check size={14} aria-hidden />}
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
          </Popover>
        )}
      </div>
      {(active.length > 0 || params.get('q')) && (
        <div className={s.chips}>
          {params.get('q') && (
            <button
              type="button"
              className={s.chip}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete('q');
                setTerm('');
                apply(next);
              }}
            >
              “{params.get('q')}” <X size={12} aria-label="Remove" />
            </button>
          )}
          {active.map(({ filter, choice }) => (
            <button
              type="button"
              key={filter.label}
              className={s.chip}
              onClick={() => apply(fromQuery(filter.choices[0].query))}
            >
              {filter.label}: {choice!.label} <X size={12} aria-label="Remove" />
            </button>
          ))}
          <button
            type="button"
            className={s.clear}
            onClick={() => {
              setTerm('');
              apply(new URLSearchParams());
            }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
