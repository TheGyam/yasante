import { BrandMark } from '@/shared/ui/BrandMark';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { useState } from 'react';
import { staffMessage, useStaffMutation, useStaffRead } from '../hooks';
import * as s from './SignIn.css';
export function SignIn() {
  const mutateStaff = useStaffMutation();
  const session = useStaffRead<{ csrfToken: string }>('session/', { retry: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className={s.gate}>
      <BrandMark />
      <Text variant="title1">Your staff workspace</Text>
      <Text tone="secondary">Sign in with your Yasante staff account.</Text>
      <form
        className={s.stack}
        onSubmit={async event => {
          event.preventDefault();
          if (!session.data || busy) return;
          const body = new FormData(event.currentTarget);
          setBusy(true);
          setError('');
          try {
            await mutateStaff('session/', body, session.data.csrfToken);
          } catch (error) {
            setError(staffMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input
          label="Email"
          name="username"
          type="email"
          autoComplete="username"
          required
          disabled={busy}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
        />
        {(error || session.isError) && (
          <InlineAlert message={error || staffMessage(session.error)} />
        )}
        <Button type="submit" label="Sign in" loading={busy} disabled={!session.data} />
        {session.isError && (
          <Button label="Try again" onClick={() => void session.refetch()} variant="secondary" />
        )}
      </form>
    </div>
  );
}
