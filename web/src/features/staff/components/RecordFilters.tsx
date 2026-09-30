import { Button } from '@/shared/ui/Button';
import { Input, Select } from '@/shared/ui/Input';
import { Search, X } from 'lucide-react';
import type { Records } from '../types';
import * as s from './RecordFilters.css';

export function RecordFilters({
  data,
  params,
  setParams,
}: {
  data: Records;
  params: URLSearchParams;
  setParams: (params: URLSearchParams | Record<string, string>) => void;
}) {
  return (
    <div className={s.filters}>
      {data.searchable && (
        <form
          className={s.search}
          onSubmit={event => {
            event.preventDefault();
            const next = new URLSearchParams(params);
            const value = new FormData(event.currentTarget).get('q') as string;
            if (value) next.set('q', value);
            else next.delete('q');
            next.delete('p');
            setParams(next);
          }}
        >
          <div className={s.grow}>
            <Input
              label={`Search ${data.name.toLowerCase()}`}
              name="q"
              type="search"
              maxLength={200}
              defaultValue={params.get('q') ?? ''}
              placeholder="Type a name or keyword"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            label={
              <>
                <Search size={16} aria-hidden />
                Search
              </>
            }
          />
        </form>
      )}
      {data.filters.map(filter => (
        <div className={s.filter} key={filter.label}>
          <Select
            label={filter.label}
            value={filter.choices.find(choice => choice.selected)?.query ?? ''}
            onChange={event =>
              setParams(new URLSearchParams(event.target.value.replace(/^\?/, '')))
            }
          >
            {filter.choices.map(choice => (
              <option key={choice.query} value={choice.query}>
                {choice.label}
              </option>
            ))}
          </Select>
        </div>
      ))}
      {params.size > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setParams({})}
          label={
            <>
              <X size={16} aria-hidden />
              Reset
            </>
          }
        />
      )}
    </div>
  );
}
