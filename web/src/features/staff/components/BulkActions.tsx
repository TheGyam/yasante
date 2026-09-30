import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Select } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { ArrowRight } from 'lucide-react';
import type { Records } from '../types';
import * as s from './BulkActions.css';

export function BulkActions({
  data,
  selected,
  setSelected,
  across,
  setAcross,
  busy,
  action,
  setAction,
  runAction,
}: {
  data: Records;
  params: URLSearchParams;
  setParams: (params: URLSearchParams | Record<string, string>) => void;
  selected: string[];
  setSelected: (value: string[]) => void;
  across: boolean;
  setAcross: (value: boolean) => void;
  busy: boolean;
  action: string;
  setAction: (value: string) => void;
  runAction: (apply?: boolean) => Promise<void>;
}) {
  const number = new Intl.NumberFormat();
  return (
    <div className={s.selection}>
      {data.count > 5000 && (
        <InlineAlert message="Bulk actions are limited to 5,000 records. Narrow your filters to select all matching records." />
      )}
      <Text variant="callout">
        {across
          ? `${number.format(data.count)} matching records selected`
          : `${selected.length} selected on this page`}
      </Text>
      {!across && data.count > selected.length && selected.length === data.rows.length && (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy || data.count > 5000}
          onClick={() => setAcross(true)}
          label={<>Select all {number.format(data.count)}matching records</>}
        />
      )}
      <div className={s.grow}>
        <Select
          label="Choose an action"
          value={action}
          onChange={event => setAction(event.target.value)}
        >
          <option value="">Select an action…</option>
          {data.actions.map(item => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <Button
        variant="ghost"
        size="sm"
        disabled={!action || busy}
        onClick={() => void runAction()}
        label={
          <>
            Review action
            <ArrowRight size={16} aria-hidden />
          </>
        }
      />
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => {
          setSelected([]);
          setAcross(false);
        }}
        label={<>Clear selection</>}
      />
    </div>
  );
}
