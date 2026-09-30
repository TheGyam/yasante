import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { staffMessage, useStaffMutation, useStaffRead } from '../hooks';
import type { Field } from '../types';
import { FieldControl } from './fields/FieldControl';
import * as s from './PasswordForm.css';
export function PasswordForm({
  csrf,
  app,
  model,
  id,
}: {
  csrf: string;
  app?: string;
  model?: string;
  id?: string;
}) {
  const path = id ? `password/${app}/${model}/${id}/` : 'password/';
  const query = useStaffRead<{ fields: Field[]; errors: string[]; revision: string }>(path, {
    refetchOnWindowFocus: false,
  });
  const [draft, setDraft] = useState<typeof query.data>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const data = draft ?? query.data;
  const navigate = useNavigate();
  const mutateStaff = useStaffMutation();
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!data) return <Skeleton className={s.loadingPanel} />;
  return (
    <>
      <Text variant="title1">Password settings</Text>
      {error && <InlineAlert message={error} />}
      {saved && <InlineAlert tone="success" message="Password settings saved." />}
      <form
        className={`${s.card} ${s.stack}`}
        noValidate
        onSubmit={async event => {
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            const result = await mutateStaff<typeof data | { saved: true }>(
              path,
              new FormData(event.currentTarget),
              csrf
            );
            if ('saved' in result) {
              setSaved(true);
              navigate(id ? `/records/${app}/${model}/${id}` : '/');
            } else setDraft(result);
          } catch (error) {
            setError(staffMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input type="hidden" name="_revision" value={data.revision} />
        {data.errors.map((message, index) => (
          <InlineAlert key={index} message={message} />
        ))}
        {data.fields.map(field => (
          <FieldControl key={field.name} field={field} disabled={busy} />
        ))}
        <Button label="Save password settings" type="submit" loading={busy} />
      </form>
    </>
  );
}
