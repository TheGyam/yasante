import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Records } from '../../types';
import { Cell } from './Cell';
import * as s from './RecordTable.css';

type Row = Records['rows'][number];

/**
 * The list itself. The whole row opens the record (⌘/Ctrl-click opens it on its own
 * page); checkboxes appear on hover and stay once anything is picked. On a phone each
 * row becomes a card: title, one line of detail, then its pills.
 */
export function RecordTable({
  data,
  selected,
  active,
  sort,
  onToggle,
  onToggleAll,
  onOpen,
}: {
  data: Records;
  selected: string[];
  active: number;
  sort: (column: Records['columns'][number]) => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (row: Row, newTab: boolean) => void;
}) {
  const selectable = data.actions.length > 0;
  const all = data.rows.length > 0 && data.rows.every(row => selected.includes(row.id));
  return (
    <div className={s.wrap} data-selecting={selected.length > 0}>
      <table className={s.table}>
        <caption className="visually-hidden">
          {data.name}, page {data.page} of {data.pages}
        </caption>
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className={s.check}>
                <input
                  type="checkbox"
                  aria-label="Select every row on this page"
                  checked={all}
                  onChange={onToggleAll}
                  className={s.box}
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
                  <button type="button" className={s.sort} onClick={() => sort(column)}>
                    {column.label}
                    {column.direction === 'asc' && <ArrowUp size={12} aria-hidden />}
                    {column.direction === 'desc' && <ArrowDown size={12} aria-hidden />}
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr
              key={row.id}
              className={s.row}
              data-active={index === active}
              data-selected={selected.includes(row.id)}
              onClick={event => {
                if ((event.target as HTMLElement).closest('input, a, button')) return;
                onOpen(row, event.metaKey || event.ctrlKey);
              }}
            >
              {selectable && (
                <td className={s.check}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.values[0]}`}
                    checked={selected.includes(row.id)}
                    onChange={() => onToggle(row.id)}
                    className={s.box}
                  />
                </td>
              )}
              {data.columns.map((column, i) => (
                <td
                  key={column.key}
                  className={i === 0 ? s.first : s.cell}
                  data-label={column.label}
                  title={row.values[i]?.length > 24 ? row.values[i] : undefined}
                >
                  {i === 0 ? (
                    <a
                      href={row.url}
                      className={s.title}
                      onClick={event => {
                        event.preventDefault();
                        onOpen(row, event.metaKey || event.ctrlKey);
                      }}
                    >
                      {row.values[0]}
                    </a>
                  ) : (
                    <Cell
                      kind={row.cells?.[i]?.kind ?? 'text'}
                      value={row.cells?.[i]?.value ?? row.values[i]}
                      text={row.values[i]}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
