import { X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Menu } from '@/shared/ui/Menu';
import { formatNumber } from '../../format';
import type { Records } from '../../types';
import * as s from './SelectionBar.css';

/** Floats over the list once anything is picked: what's selected and what can be done. */
export function SelectionBar({
  data,
  count,
  across,
  pageSelected,
  busy,
  onAcross,
  onAction,
  onClear,
}: {
  data: Records;
  count: number;
  across: boolean;
  pageSelected: boolean;
  busy: boolean;
  onAcross: () => void;
  onAction: (key: string) => void;
  onClear: () => void;
}) {
  const [first, ...rest] = data.actions.filter(action => action.key !== 'delete_selected');
  const remove = data.actions.find(action => action.key === 'delete_selected');
  const shown = [first, ...rest.slice(0, 1)].filter(Boolean);
  const more = [...rest.slice(1), ...(remove ? [remove] : [])];
  return (
    <div className={s.bar} role="region" aria-label="Selected records">
      <span className={s.count}>
        {across ? `All ${formatNumber(data.count)} selected` : `${formatNumber(count)} selected`}
      </span>
      {!across && pageSelected && data.count > count && data.count <= 5000 && (
        <button type="button" className={s.link} onClick={onAcross}>
          Select all {formatNumber(data.count)}
        </button>
      )}
      <span className={s.divider} />
      {shown.map(action => (
        <Button
          key={action.key}
          label={action.label}
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => onAction(action.key)}
        />
      ))}
      {more.length > 0 && (
        <Menu
          label="More"
          align="end"
          items={more.map(action => ({
            label: action.label,
            danger: action.key === 'delete_selected',
            onSelect: () => onAction(action.key),
          }))}
        />
      )}
      <Button
        label=""
        aria-label="Clear selection"
        icon={X}
        size="sm"
        variant="quiet"
        onClick={onClear}
      />
    </div>
  );
}
