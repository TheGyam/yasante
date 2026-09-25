import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ListPlus, Plus, X } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, Select } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Page } from '@/shared/ui/Page';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useMenu, useRemoveMenuItem, useSaveMenuItem } from '../hooks';
import { formatDuration } from '../format';
import {
  DURATIONS,
  OPTION_GROUPS,
  SERVICE_PRESETS,
  TYPICAL_OPTIONS,
  type OptionDraft,
} from '../menu';
import type { MenuItem, OptionGroup } from '../types';
import * as styles from './StudioScreens.css';

export interface ServiceScreenProps {
  accountId: string;
  /** Undefined adds a new service. */
  id?: string;
}

/** One service, added or edited: `/menu/new` or `/menu/{id}`. */
export function ServiceScreen({ accountId, id }: ServiceScreenProps) {
  const menu = useMenu(accountId);
  if (id && menu.isPending) {
    return (
      <Page title="A service">
        <Skeleton style={{ height: 320, borderRadius: 20 }} />
      </Page>
    );
  }
  const item = id ? menu.data?.find(i => i.id === id) : undefined;
  if (id && !item) {
    return (
      <Page title="A service">
        <EmptyState
          as="h1"
          title="That service isn’t on your menu"
          action={<Button label="Back to your menu" variant="secondary" size="md" to="/menu" />}
        />
      </Page>
    );
  }
  return <ServiceForm key={id ?? 'new'} accountId={accountId} item={item} />;
}

/** Options as typed: prices stay text until they're saved. */
type Row = Omit<OptionDraft, 'add'> & { key: number; add: string };
let nextKey = 0;
const toRow = (o: OptionDraft): Row => ({ ...o, key: nextKey++, add: o.add ? String(o.add) : '' });
const money = (text: string) => Number(text.replace(/[^\d.]/g, '')) || 0;

function ServiceForm({ accountId, item }: { accountId: string; item?: MenuItem }) {
  const navigate = useNavigate();
  const save = useSaveMenuItem(accountId);
  const remove = useRemoveMenuItem(accountId);
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [fromPrice, setFromPrice] = useState(item?.fromPrice ?? false);
  const [minutes, setMinutes] = useState(item?.durationMinutes ?? 0);
  const [hairIncluded, setHairIncluded] = useState(item?.hairIncluded ?? false);
  const [note, setNote] = useState(item?.note ?? '');
  const [rows, setRows] = useState<Row[]>(() => (item?.options ?? []).map(toRow));
  const [problem, setProblem] = useState<string>();

  const base = money(price);
  const pickPreset = (preset: (typeof SERVICE_PRESETS)[number]) => {
    setName(preset.name);
    setMinutes(preset.minutes);
    if (!rows.length && preset.by.length) {
      setRows(TYPICAL_OPTIONS.filter(o => preset.by.includes(o.group)).map(toRow));
    }
  };
  const change = (key: number, changes: Partial<Row>) =>
    setRows(all => all.map(r => (r.key === key ? { ...r, ...changes } : r)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setProblem('Name the service');
    if (!base) return setProblem('Add a price');
    setProblem(undefined);
    save.mutate(
      {
        id: item?.id,
        draft: {
          name: name.trim(),
          price: base,
          fromPrice,
          durationMinutes: minutes || null,
          hairIncluded,
          note: note.trim(),
          options: rows
            .filter(r => r.label.trim())
            .map(r => ({
              group: r.group,
              label: r.label.trim(),
              add: money(r.add),
              ...(r.addMinutes ? { addMinutes: r.addMinutes } : {}),
            })),
        },
      },
      { onSuccess: () => navigate('/menu') }
    );
  };

  return (
    <Page title={item ? 'Edit service' : 'Add a service'}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <div>
          <Link to="/menu">
            <Text variant="footnote" tone="accent">
              ← Your menu
            </Text>
          </Link>
          <Text variant="title1">{item ? 'Edit service' : 'Add a service'}</Text>
        </div>

        {!item && (
          <div className={styles.chips} aria-label="Start from">
            {SERVICE_PRESETS.map(preset => (
              <Chip
                key={preset.name}
                label={preset.name}
                selected={name === preset.name}
                onClick={() => pickPreset(preset)}
              />
            ))}
          </div>
        )}

        <Glass padded radius="xl" className={styles.card}>
          <Input
            label="What you call it"
            value={name}
            placeholder="Knotless braids"
            onChange={e => setName(e.target.value)}
          />
          <Input
            label="Price (£)"
            inputMode="decimal"
            value={price}
            placeholder="120"
            onChange={e => setPrice(e.target.value)}
          />
          <Checkbox checked={fromPrice} onChange={setFromPrice}>
            <Text variant="callout" as="span">
              This is a starting price
            </Text>
            <Text variant="footnote" tone="secondary" as="span">
              {' '}
              — shows as “from {base ? formatMoney(base) : '£120'}”
            </Text>
          </Checkbox>
          <Select
            label="How long it takes"
            value={minutes}
            onChange={e => setMinutes(Number(e.target.value))}
          >
            <option value={0}>Not saying</option>
            {DURATIONS.map(m => (
              <option key={m} value={m}>
                {formatDuration(m)}
              </option>
            ))}
          </Select>
        </Glass>

        <Glass padded radius="xl" className={styles.card}>
          <div className={styles.group}>
            <Text variant="overline" tone="tertiary" as="h2">
              Priced by length or size
            </Text>
            <Text variant="footnote" tone="secondary">
              The first of each is your base price. Clients pick theirs, and see what it comes to
              before they ask.
            </Text>
          </div>
          {!rows.length && (
            <Button
              label="Start with typical prices"
              icon={ListPlus}
              variant="secondary"
              onClick={() => setRows(TYPICAL_OPTIONS.map(toRow))}
            />
          )}
          {OPTION_GROUPS.map(({ group, name: groupName }) => {
            const inGroup = rows.filter(r => r.group === group);
            return (
              <div key={group} className={styles.group}>
                {inGroup.map((row, index) => (
                  <div key={row.key} className={styles.option}>
                    <Input
                      label={index === 0 ? `${groupName} (base)` : groupName}
                      value={row.label}
                      placeholder={group === 'length' ? 'Waist' : 'Small'}
                      onChange={e => change(row.key, { label: e.target.value })}
                    />
                    <Input
                      label="Adds £"
                      inputMode="decimal"
                      value={row.add}
                      placeholder="0"
                      onChange={e => change(row.key, { add: e.target.value })}
                    />
                    <Button
                      label="Remove"
                      icon={X}
                      variant="ghost"
                      size="sm"
                      onClick={() => setRows(all => all.filter(r => r.key !== row.key))}
                    />
                  </div>
                ))}
                <div>
                  <Button
                    label={`Add a ${groupName.toLowerCase()}`}
                    icon={Plus}
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRows(all => [
                        ...all,
                        toRow({ group: group as OptionGroup, label: '', add: 0 }),
                      ])
                    }
                  />
                </div>
              </div>
            );
          })}
        </Glass>

        <Glass padded radius="xl" className={styles.card}>
          <Checkbox checked={hairIncluded} onChange={setHairIncluded}>
            <Text variant="callout" as="span">
              Hair is included
            </Text>
            <Text variant="footnote" tone="secondary" as="span">
              {' '}
              — you bring the braiding hair, and it’s in the price
            </Text>
          </Checkbox>
          <Input
            label="Anything they should know"
            value={note}
            placeholder="Hair not included"
            onChange={e => setNote(e.target.value)}
          />
        </Glass>

        {(problem || save.isError) && (
          <InlineAlert
            message={problem ?? errorMessage(save.error, 'Couldn’t save that service.')}
          />
        )}
        <div className={styles.actions}>
          <Button type="submit" label={item ? 'Save' : 'Add to my menu'} loading={save.isPending} />
          {item && (
            <Button
              label="Remove from my menu"
              variant="ghost"
              loading={remove.isPending}
              onClick={() => {
                if (window.confirm(`Remove ${item.name} from your menu?`)) {
                  remove.mutate(item.id, { onSuccess: () => navigate('/menu') });
                }
              }}
            />
          )}
        </div>
      </form>
    </Page>
  );
}
