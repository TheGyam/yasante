import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useState } from 'react';
import { staffMessage, useFinishVerification, useStaffMutation, useStaffRead } from '../hooks';
import type { Factor, FactorVerified } from '../types';
import * as s from './TwoFactor.css';

export function TwoFactor({ csrf }: { csrf: string }) {
  const query = useStaffRead<Factor>('two-factor/', { refetchOnWindowFocus: false });
  const mutate = useStaffMutation(),
    finish = useFinishVerification();
  const [codes, setCodes] = useState<string[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!query.data) return <Skeleton className={s.loadingPanel} />;
  if (codes.length)
    return (
      <section className={s.gate}>
        <Text variant="title1">Save your recovery codes</Text>
        <Text>Each code works once. Store these somewhere safe. They will not be shown again.</Text>
        <ul>
          {codes.map(code => (
            <li key={code}>
              <code>{code}</code>
            </li>
          ))}
        </ul>
        <Button label="I saved my codes" onClick={() => void finish()} />
      </section>
    );
  return (
    <section className={s.gate}>
      <Text variant="title1">
        {query.data.phase === 'enroll' ? 'Set up two-factor authentication' : 'Verify your sign-in'}
      </Text>
      {query.data.secret && (
        <>
          <Text>Add this secret to your authenticator app, with account name Yasante.</Text>
          <code>{query.data.secret}</code>
          <Text variant="caption">Authenticator URI</Text>
          <code className={s.field}>{query.data.uri}</code>
        </>
      )}
      <form
        className={s.stack}
        onSubmit={async event => {
          event.preventDefault();
          if (busy) return;
          const body = new FormData(event.currentTarget);
          setBusy(true);
          setError('');
          try {
            const data = await mutate<FactorVerified>('two-factor/', body, csrf);
            if (data.recoveryCodes.length) setCodes(data.recoveryCodes);
            else await finish();
          } catch (error) {
            setError(staffMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input
          label={
            query.data.phase === 'enroll'
              ? 'First six-digit code'
              : 'Authenticator or recovery code'
          }
          name="code"
          autoComplete="one-time-code"
          required
          maxLength={20}
        />
        {error && <InlineAlert message={error} />}
        <Button type="submit" label="Verify code" loading={busy} />
      </form>
    </section>
  );
}
