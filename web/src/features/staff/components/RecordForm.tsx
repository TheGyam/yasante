import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Pencil, Save, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Kbd } from '@/shared/ui/Kbd';
import { Menu } from '@/shared/ui/Menu';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import {
  staffMessage,
  useDraftGuard,
  useRecordForm,
  useShortcuts,
  useStaffMutation,
  useStaffRead,
} from '../hooks';
import type { Deletion, Field, FormSchema, Saved } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { DeletionReview } from './DeletionReview';
import { FormSection } from './FormSection';
import { InlineGroup } from './InlineGroup';
import * as ui from './ui.css';
import * as s from './RecordForm.css';

const slug = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');

/**
 * A record's details. Existing records open read-only, so nothing changes by accident;
 * Edit (or e) turns them into a form, and a save bar appears once something changes.
 */
export function RecordForm({
  app,
  model,
  id,
  csrf,
  inPanel = false,
  onSaved,
  onDeleted,
}: {
  app: string;
  model: string;
  id?: string;
  csrf: string;
  inPanel?: boolean;
  onSaved?: (saved: Saved) => void;
  onDeleted?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const mutate = useStaffMutation();
  const base = `/records/${app}/${model}`;
  const { query, path } = useRecordForm(app, model, id, inPanel ? '' : location.search);
  const [draft, setDraft] = useState<FormSchema>();
  const [reading, setReading] = useState(!!id);
  const [dirty, setDirtyState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deletion, setDeletion] = useState<Deletion>();
  const [version, setVersion] = useState(0);
  const guard = useDraftGuard();
  const form = useRef<HTMLFormElement>(null);
  const intent = useRef('');
  const deletionQuery = useStaffRead<Deletion>(
    `delete/${app}/${model}/${encodeURIComponent(id ?? '')}/`,
    { enabled: false }
  );
  const schema = draft ?? query.data;
  const editing = !reading && !!schema?.editable;

  const markDirty = (value: boolean) => {
    guard.setDirty(value);
    setDirtyState(value);
  };
  const discard = () => {
    markDirty(false);
    setDraft(undefined);
    setError('');
    setVersion(current => current + 1);
    if (id) setReading(true);
  };
  const save = (kind = '') => {
    intent.current = kind;
    form.current?.requestSubmit();
  };

  useShortcuts({ e: () => schema?.editable && setReading(false) }, reading);
  // ⌘S / Ctrl+S saves even from inside a field.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (editing) save();
    }
  };

  const relationSource = (field: Field, inline?: string) => {
    const name = inline
      ? field.name.replace(`${inline}-`, '').replace(/^(\d+|__prefix__)-/, '')
      : field.name;
    return `choices/${app}/${model}/?field=${encodeURIComponent(name)}${id ? `&object=${encodeURIComponent(id)}` : ''}${inline ? `&inline=${encodeURIComponent(inline)}` : ''}`;
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schema || busy) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const body = new FormData(event.currentTarget);
    if (intent.current === 'saveasnew') body.set('_saveasnew', '1');
    setBusy(true);
    setError('');
    try {
      const result = await mutate<FormSchema | Saved>(path, body, csrf);
      if ('saved' in result) {
        markDirty(false);
        setDraft(undefined);
        toast(
          id && intent.current !== 'saveasnew' ? 'Saved' : `Created the new ${schema.singular}`
        );
        if (submitter?.name === 'inline-page') navigate(`${result.url}?${submitter.value}`);
        else if (intent.current === 'addanother') {
          setVersion(current => current + 1);
          navigate(`${base}/new`);
        } else if (!id || intent.current === 'saveasnew') {
          if (onSaved) onSaved(result);
          else navigate(result.url);
        } else setReading(true);
      } else {
        setDraft(result);
        setError('Some fields need attention. Nothing has been saved yet.');
        requestAnimationFrame(() =>
          form.current
            ?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error="true"] input')
            ?.focus()
        );
      }
    } catch (failure) {
      setError(staffMessage(failure));
    } finally {
      intent.current = '';
      setBusy(false);
    }
  }

  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!schema)
    return (
      <div className={s.stack}>
        <Skeleton className={s.sectionSkeleton} />
        <Skeleton className={s.sectionSkeleton} />
      </div>
    );

  const related = deletion
    ? Object.values(deletion.counts).reduce((sum, count) => sum + count, 0) - 1
    : 0;
  return (
    <div className={s.stack} onKeyDown={onKeyDown}>
      <ConfirmDialog
        open={guard.blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        onConfirm={() => guard.blocker.proceed?.()}
        onClose={() => guard.blocker.reset?.()}
      />
      {id && schema.editable && (
        <div className={s.modeBar}>
          {reading ? (
            <Button
              label="Edit"
              icon={Pencil}
              size="sm"
              variant="secondary"
              onClick={() => setReading(false)}
              trailing={<Kbd>e</Kbd>}
            />
          ) : (
            <Text variant="footnote" tone="secondary">
              Editing. Changes save when you press Save.
            </Text>
          )}
        </div>
      )}
      {!schema.editable && id && (
        <Text variant="footnote" tone="tertiary">
          You can view this record but not change it.
        </Text>
      )}
      {error && <InlineAlert message={error} />}
      {schema.errors.map((message, index) => (
        <InlineAlert key={index} message={message} />
      ))}
      <form
        ref={form}
        key={`${schema.revision}-${version}`}
        className={s.stack}
        onSubmit={submit}
        onChange={() => editing && markDirty(true)}
        onClick={event => {
          if (
            editing &&
            event.target instanceof HTMLElement &&
            event.target.closest('[data-relation-choice], button[aria-label^="Remove "]')
          )
            markDirty(true);
        }}
        noValidate
        onBlur={event => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement)) return;
          for (const [name, sources] of Object.entries(schema.prepopulated)) {
            if (!sources.includes(target.name)) continue;
            const input = event.currentTarget.elements.namedItem(name) as HTMLInputElement | null;
            if (input && !input.value)
              input.value = slug(
                sources
                  .map(
                    source =>
                      (event.currentTarget.elements.namedItem(source) as HTMLInputElement | null)
                        ?.value ?? ''
                  )
                  .join(' ')
              );
          }
        }}
      >
        <input type="hidden" name="_revision" value={schema.revision} />
        <FormSection
          sections={schema.sections}
          source={field => relationSource(field)}
          disabled={!editing || busy}
          reading={!editing}
        />
        {schema.inlines.map((inline, index) => (
          <InlineGroup
            key={inline.prefix}
            inline={inline}
            inlineIndex={index}
            schema={schema}
            setDraft={setDraft}
            relationSource={relationSource}
            busy={busy || !editing}
            base={base}
            id={id}
            setDirty={value => markDirty(value ?? true)}
          />
        ))}
        {editing && (dirty || !id) && (
          <div className={s.saveBar} data-panel={inPanel}>
            <Text variant="callout" className={s.saveText}>
              {id ? 'Unsaved changes' : `New ${schema.singular}`}
            </Text>
            {id && (
              <Button label="Discard" variant="quiet" size="sm" disabled={busy} onClick={discard} />
            )}
            {(!id || schema.canSaveAs) && (
              <Menu
                label="More save options"
                iconOnly
                icon={Save}
                align="end"
                items={[
                  ...(!id
                    ? [{ label: 'Save and add another', onSelect: () => save('addanother') }]
                    : []),
                  ...(schema.canSaveAs
                    ? [{ label: 'Save as a new record', onSelect: () => save('saveasnew') }]
                    : []),
                ]}
              />
            )}
            <Button label="Save" type="submit" size="sm" loading={busy} trailing={<Kbd>⌘S</Kbd>} />
          </div>
        )}
      </form>
      {schema.canDelete && id && (
        <section className={s.danger} aria-labelledby="danger-title">
          <div className={ui.stack}>
            <Text variant="bodyStrong" id="danger-title">
              Delete this record
            </Text>
            <Text variant="footnote" tone="secondary">
              You’ll see everything that goes with it before anything is deleted.
            </Text>
          </div>
          <Button
            label="Delete…"
            icon={Trash2}
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={async () => {
              const result = await deletionQuery.refetch();
              if (result.error) setError(staffMessage(result.error));
              else setDeletion(result.data);
            }}
          />
        </section>
      )}
      <ConfirmDialog
        open={!!deletion}
        title="Delete this record?"
        onClose={() => setDeletion(undefined)}
      >
        {deletion && <DeletionReview deletion={deletion} />}
        <div className={ui.actions}>
          <Button
            label={
              related > 0
                ? `Delete ${schema.object} and ${related} related`
                : `Delete ${schema.object}`
            }
            disabled={!deletion?.canDelete || busy}
            loading={busy}
            onClick={async () => {
              if (!deletion) return;
              setBusy(true);
              const body = new FormData();
              body.set('_revision', deletion.revision);
              body.set('post', 'yes');
              try {
                const result = await mutate<{ deleted?: boolean }>(
                  `delete/${app}/${model}/${encodeURIComponent(id!)}/`,
                  body,
                  csrf
                );
                if (result.deleted) {
                  markDirty(false);
                  setDeletion(undefined);
                  toast(`Deleted ${schema.object}`);
                  if (onDeleted) onDeleted();
                  else navigate(base);
                }
              } catch (failure) {
                setError(staffMessage(failure));
                setDeletion(undefined);
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button label="Cancel" variant="secondary" onClick={() => setDeletion(undefined)} />
        </div>
      </ConfirmDialog>
    </div>
  );
}
