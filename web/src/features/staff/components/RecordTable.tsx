import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Link } from '@/shared/ui/Link';
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight } from 'lucide-react';
import type { Records } from '../types';
import * as s from './RecordTable.css';

export function RecordTable({
  data,
  params,
  setParams,
  selected,
  setSelected,
  setAcross,
  busy,
}: {
  data: Records;
  params: URLSearchParams;
  setParams: (params: URLSearchParams | Record<string, string>) => void;
  selected: string[];
  setSelected: (value: string[]) => void;
  across: boolean;
  setAcross: (value: boolean) => void;
  busy: boolean;
}) {
  return (
    <div className={s.recordTableWrap}>
      <div className={s.mobileSelection}>
        {!!data.actions.length && (
          <Checkbox
            label="Select this page"
            checked={data.rows.length > 0 && selected.length === data.rows.length}
            disabled={busy || !data.rows.length}
            onChange={checked => {
              setSelected(checked ? data.rows.map(row => row.id) : []);
              setAcross(false);
            }}
          />
        )}
      </div>
      <table className={s.table}>
        <caption className="visually-hidden">
          {data.name}, page {data.page}
        </caption>
        <thead>
          <tr>
            {!!data.actions.length && (
              <th scope="col">
                <Checkbox
                  aria-label="Select all records on this page"
                  disabled={!data.rows.length || busy}
                  checked={data.rows.length > 0 && selected.length === data.rows.length}
                  onChange={checked => {
                    setSelected(checked ? data.rows.map(row => row.id) : []);
                    setAcross(false);
                  }}
                />
              </th>
            )}
            {data.columns.map(column => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  column.direction === 'asc'
                    ? 'ascending'
                    : column.direction === 'desc'
                      ? 'descending'
                      : undefined
                }
              >
                {column.sort === null ? (
                  column.label
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set(
                        'o',
                        column.direction === 'asc' ? `-${column.sort}` : String(column.sort)
                      );
                      next.delete('p');
                      setParams(next);
                    }}
                    label={
                      <>
                        {column.label}
                        {column.direction === 'asc' ? (
                          <ArrowUp size={12} aria-hidden />
                        ) : column.direction === 'desc' ? (
                          <ArrowDown size={12} aria-hidden />
                        ) : (
                          <ArrowUpDown size={12} aria-hidden />
                        )}
                      </>
                    }
                  />
                )}
              </th>
            ))}
            <th scope="col">
              <span className="visually-hidden">Open record</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row.id}>
              {!!data.actions.length && (
                <td>
                  <Checkbox
                    aria-label={`Select ${row.values[0]}`}
                    checked={selected.includes(row.id)}
                    disabled={busy}
                    onChange={checked => {
                      setAcross(false);
                      setSelected(
                        checked ? [...selected, row.id] : selected.filter(id => id !== row.id)
                      );
                    }}
                  />
                </td>
              )}
              {row.values.map((value, index) => (
                <td
                  key={data.columns[index].key}
                  data-label={index === 0 ? undefined : data.columns[index].label}
                  data-title={index === 0 ? true : undefined}
                >
                  {index === 0 ? <Link to={row.url}>{value}</Link> : value}
                </td>
              ))}
              <td>
                <Link className={s.button} to={row.url} aria-label={`Open ${row.values[0]}`}>
                  <ArrowUpRight size={16} aria-hidden />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!data.rows.length && (
        <EmptyState title="No records found" body="Try a different search or reset your filters." />
      )}
    </div>
  );
}
