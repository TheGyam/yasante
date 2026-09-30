import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Link } from '@/shared/ui/Link';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { ArrowLeft, History, KeyRound } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { staffMessage, useDraftGuard, useStaffMutation, useStaffRead } from '../hooks';
import type { Deletion, Field, FormSchema, Saved } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { DeletionReview } from './DeletionReview';
import { FormSection } from './FormSection';
import { InlineGroup } from './InlineGroup';
import * as s from './RecordForm.css';
import { RecordFormActions } from './RecordFormActions';
export function RecordForm({
  app,
  model,
  id,
  csrf,
}: {
  app: string;
  model: string;
  id?: string;
  csrf: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const mutateStaff = useStaffMutation();
  const base = `/records/${app}/${model}`;
  const path = `forms/${app}/${model}/${id ? `${encodeURIComponent(id)}/` : ''}${location.search}`;
  const query = useStaffRead<FormSchema>(path, { refetchOnWindowFocus: false });
  const [draft, setDraft] = useState<FormSchema>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetReview, setResetReview] = useState(false);
  const { setDirty, blocker } = useDraftGuard();
  const [deletion, setDeletion] = useState<Deletion>();
  const confirm = useRef<HTMLDialogElement>(null);
  const deletionQuery = useStaffRead<Deletion>(`delete/${app}/${model}/${id}/`, { enabled: false });
  const schema = draft ?? query.data;
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
    if (submitter?.name === '_saveasnew') body.set('_saveasnew', '1');
    setBusy(true);
    setError('');
    try {
      const result = await mutateStaff<FormSchema | Saved>(path, body, csrf);
      if ('saved' in result) {
        setDirty(false);
        setDraft(undefined);
        navigate(
          submitter?.name === 'inline-page'
            ? `${result.url}?${submitter.value}`
            : submitter?.name === '_continue'
              ? result.url
              : submitter?.name === '_addanother'
                ? `${base}/new`
                : base
        );
      } else {
        setDraft(result);
        setError('Please check the highlighted fields. Nothing has been saved.');
      }
    } catch (failure) {
      setError(staffMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!schema) return <Skeleton className={s.loadingPanel} />;
  return (
    <>
      <ConfirmDialog
        open={resetReview}
        title="Reset this staff member’s two-factor authentication?"
        onClose={() => setResetReview(false)}
      >
        <Text>
          This revokes their existing staff verification. They must sign in and enroll again.
        </Text>
        <Button
          label="Reset two-factor authentication"
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await mutateStaff(`two-factor/reset/${id}/`, new FormData(), csrf);
              setResetReview(false);
            } catch (error) {
              setError(staffMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button label="Cancel" variant="secondary" onClick={() => setResetReview(false)} />
      </ConfirmDialog>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        onConfirm={() => blocker.proceed?.()}
        onClose={() => blocker.reset?.()}
      />
      <div className={s.between}>
        <div className={s.stack}>
          <Link to={base} className={s.row}>
            <ArrowLeft size={16} aria-hidden />
            Back to {schema.name} records
          </Link>
          <Text variant="title1">{schema.title}</Text>
          <Text variant="subhead" tone="secondary">
            {schema.object}
          </Text>
        </div>
        <div className={s.row}>
          {id && (
            <Button
              to={`${base}/${id}/history`}
              label="History"
              icon={History}
              variant="secondary"
              size="md"
            />
          )}
          {schema.password && (
            <Button
              to={`${base}/${id}/password`}
              label="Change password"
              icon={KeyRound}
              variant="secondary"
              size="md"
            />
          )}
          {schema.canResetTwoFactor && (
            <Button
              label="Reset 2FA"
              variant="secondary"
              size="md"
              onClick={() => setResetReview(true)}
            />
          )}
        </div>
      </div>
      {error && <InlineAlert message={error} />}
      {schema.errors.map((message, index) => (
        <InlineAlert key={index} message={message} />
      ))}
      <form
        key={schema.revision}
        className={s.stack}
        onSubmit={submit}
        onChange={() => setDirty(true)}
        onClick={event => {
          if (
            event.target instanceof HTMLElement &&
            (event.target.closest(`.${s.choice}`) ||
              event.target.closest('button[aria-label^="Remove "]'))
          )
            setDirty(true);
        }}
        noValidate
        onBlur={event => {
          const form = event.currentTarget;
          for (const [target, sources] of Object.entries(schema.prepopulated)) {
            if (event.target instanceof HTMLInputElement && sources.includes(event.target.name)) {
              const input = form.elements.namedItem(target) as HTMLInputElement | null;
              if (input && !input.value)
                input.value = sources
                  .map(
                    name => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? ''
                  )
                  .join(' ')
                  .normalize('NFKD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .toLowerCase()
                  .replace(/[^a-z0-9_\s-]/g, '')
                  .trim()
                  .replace(/[\s-]+/g, '-');
            }
          }
        }}
      >
        <input type="hidden" name="_revision" value={schema.revision} />
        <FormSection
          sections={schema.sections}
          source={field => relationSource(field)}
          disabled={!schema.editable || busy}
        />
        {schema.inlines.map((inline, inlineIndex) => (
          <InlineGroup
            key={inline.prefix}
            inline={inline}
            inlineIndex={inlineIndex}
            schema={schema}
            setDraft={setDraft}
            relationSource={relationSource}
            busy={busy}
            base={base}
            id={id}
            setDirty={setDirty}
          />
        ))}
        <RecordFormActions
          schema={schema}
          id={id}
          busy={busy}
          onClose={() => navigate(base)}
          onDelete={async () => {
            setError('');
            try {
              const result = await deletionQuery.refetch();
              if (result.error) throw result.error;
              setDeletion(result.data!);
              confirm.current?.showModal();
            } catch (error) {
              setError(staffMessage(error));
            }
          }}
        />
      </form>
      <ConfirmDialog ref={confirm} className={s.dialog} aria-labelledby="delete-title">
        <div className={s.stack}>
          <Text variant="title2" id="delete-title">
            Review deletion
          </Text>
          {deletion && <DeletionReview deletion={deletion} />}
          <div className={s.row}>
            <Button
              label="Permanently delete"
              disabled={!deletion?.canDelete || busy}
              loading={busy}
              onClick={async () => {
                if (!deletion) return;
                setBusy(true);
                const body = new FormData();
                body.set('_revision', deletion.revision);
                body.set('post', 'yes');
                try {
                  const result = await mutateStaff<{ deleted?: boolean }>(
                    `delete/${app}/${model}/${id}/`,
                    body,
                    csrf
                  );
                  if (result.deleted) {
                    setDirty(false);
                    navigate(base);
                  } else setError('Deletion was blocked. Review related records.');
                } catch (error) {
                  setError(staffMessage(error));
                } finally {
                  setBusy(false);
                  confirm.current?.close();
                }
              }}
            />
            <Button label="Cancel" variant="secondary" onClick={() => confirm.current?.close()} />
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}
