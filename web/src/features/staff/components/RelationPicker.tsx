import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { Skeleton } from '@/shared/ui/Skeleton';
import { X } from 'lucide-react';
import { useState } from 'react';
import { staffMessage, useStaffRead } from '../hooks';
import type { Field } from '../types';
import * as s from './RelationPicker.css';
export function RelationPicker({
  field,
  source,
  disabled,
}: {
  field: Field;
  source: string;
  disabled: boolean;
}) {
  const initial = field.multiple
    ? Array.isArray(field.value)
      ? field.value
      : []
    : field.value
      ? [String(field.value)]
      : [];
  const [picked, setPicked] = useState(initial);
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries((field.options ?? []).map(option => [option.value, option.label]))
  );
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState(false);
  const search = useDebouncedValue(term, 250);
  const query = useStaffRead<{
    options: { value: string; label: string }[];
    more: boolean;
    addUrl: string | null;
    recordUrl: string | null;
  }>(`${source}&q=${encodeURIComponent(search)}&p=${page}`, { enabled: opened && !disabled });
  return (
    <div className={s.field}>
      <Text variant="callout">
        {field.label}
        {field.required ? ' *' : ''}
      </Text>
      {picked.map(value => (
        <div className={s.row} key={value}>
          <input type="hidden" name={field.name} value={value} />
          <span>{labels[value] ?? value}</span>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              type="button"

              aria-label={`Remove ${labels[value] ?? value}`}
              onClick={() => setPicked(picked.filter(id => id !== value))}
              label={
                <>
                  <X size={14} aria-hidden />
                </>
              }
            />
          )}
        </div>
      ))}
      {!picked.length && (
        <Text variant="subhead" tone="secondary">
          No record selected
        </Text>
      )}
      {!disabled && (
        <Button
          variant="ghost"
          size="sm"
          type="button"

          onClick={() => setOpened(!opened)}
          aria-expanded={opened}
          label={<>{field.multiple ? 'Choose records' : 'Choose a record'}</>}
        />
      )}
      {opened && (
        <div className={s.stack}>
          <div className={s.row}>
            {query.data?.addUrl && (
              <Link to={query.data.addUrl} className={s.button} target="_blank" rel="noopener">
                Create a related record
              </Link>
            )}
            {query.data?.recordUrl &&
              picked.map(value => (
                <Link
                  key={value}
                  to={`${query.data!.recordUrl}/${encodeURIComponent(value)}`}
                  target="_blank"
                  rel="noopener"
                  className={s.button}
                >
                  View selected record
                </Link>
              ))}
          </div>
          <Input
            label={`Find ${field.label.toLowerCase()}`}
            type="search"
            value={term}
            onChange={event => {
              setTerm(event.target.value);
              setPage(1);
            }}
          />
          {query.isError && <InlineAlert message={staffMessage(query.error)} />}
          {query.isFetching && <Skeleton className={s.loadingLine} />}
          <div className={s.choiceList}>
            {query.data?.options.map(option => (
              <Button
                variant="ghost"
                size="sm"
                className={s.choice}
                data-relation-choice
                key={option.value}
                type="button"
                aria-pressed={picked.includes(option.value)}
                onClick={() => {
                  setLabels({ ...labels, [option.value]: option.label });
                  setPicked(
                    field.multiple
                      ? picked.includes(option.value)
                        ? picked.filter(id => id !== option.value)
                        : [...picked, option.value]
                      : [option.value]
                  );
                  if (!field.multiple) setOpened(false);
                }}
                label={
                  <>
                    {option.label}
                    {picked.includes(option.value) && <span>Selected</span>}
                  </>
                }
              />
            ))}
          </div>
          {query.data && !query.data.options.length && (
            <Text variant="caption">No matching records.</Text>
          )}
          <div className={s.row}>
            <Button
              variant="ghost"
              size="sm"
              type="button"

              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              label={<>Previous</>}
            />
            <Button
              variant="ghost"
              size="sm"
              type="button"

              disabled={!query.data?.more}
              onClick={() => setPage(page + 1)}
              label={<>Next</>}
            />
          </div>
        </div>
      )}
      {field.help && (
        <Text variant="caption" tone="secondary">
          {field.help}
        </Text>
      )}
      {!!field.errors.length && <InlineAlert message={field.errors.join(' ')} />}
    </div>
  );
}
