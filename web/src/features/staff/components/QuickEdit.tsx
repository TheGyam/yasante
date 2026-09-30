import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { staffMessage, useDraftGuard, useStaffMutation, useStaffRead } from '../hooks';
import type { QuickSchema } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { FieldControl } from './fields/FieldControl';
import * as s from './QuickEdit.css';
export function QuickEdit({ app, model, csrf }: { app: string; model: string; csrf: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const mutateStaff = useStaffMutation();
  const path = `quick-edit/${app}/${model}/${location.search}`;
  const query = useStaffRead<QuickSchema>(path, { refetchOnWindowFocus: false });
  const [draft, setDraft] = useState<QuickSchema>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const data = draft ?? query.data;
  const { setDirty, blocker } = useDraftGuard();
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!data) return <Skeleton className={s.loadingPanel} />;
  const back = `/records/${app}/${model}${location.search}`;
  return (
    <>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        onConfirm={() => blocker.proceed?.()}
        onClose={() => blocker.reset?.()}
      />
      <Button to={back} label="Back to records" icon={ArrowLeft} variant="secondary" />
      <Text variant="title1">Quick edit · {data.name}</Text>
      {error && <InlineAlert message={error} />}
      <form
        className={s.stack}
        onChange={() => setDirty(true)}
        noValidate
        onSubmit={async event => {
          event.preventDefault();
          if (busy) return;
          const body = new FormData(event.currentTarget);
          setBusy(true);
          setError('');
          try {
            const result = await mutateStaff<QuickSchema | { saved: true }>(path, body, csrf);
            if ('saved' in result) {
              setDirty(false);
              navigate(back);
            } else {
              setDraft(result);
              setError('Check the highlighted fields. Nothing has been saved.');
            }
          } catch (error) {
            setError(staffMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input type="hidden" name="_revision" value={data.revision} />
        {data.management.map(field => (
          <FieldControl key={field.name} field={field} />
        ))}
        {data.errors.map((error, index) => (
          <InlineAlert key={index} message={error} />
        ))}
        {data.forms.map((form, index) => (
          <section key={index} className={s.card}>
            <Text variant="title3">{form.label}</Text>
            {form.errors.map((error, index) => (
              <InlineAlert key={index} message={error} />
            ))}
            <div className={s.fields}>
              {form.fields.map(field => (
                <FieldControl key={field.name} field={field} disabled={busy} />
              ))}
            </div>
          </section>
        ))}
        <div className={s.editorActions}>
          <Button label="Save quick edits" type="submit" loading={busy} />
        </div>
      </form>
    </>
  );
}
