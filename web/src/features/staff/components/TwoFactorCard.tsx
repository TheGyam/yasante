import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Text } from '@/shared/ui/Text';
import { formatDate } from '../format';
import { staffMessage, useStaffMutation, useStaffRead } from '../hooks';
import * as ui from './ui.css';
import * as s from './TwoFactorCard.css';

/** Your second factor: when it was set up, recovery codes left, and a way to get new ones. */
export function TwoFactorCard({ csrf }: { csrf: string }) {
  const status = useStaffRead<{ remaining: number; since: string }>('two-factor/codes/');
  const mutate = useStaffMutation();
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);

  const replace = async () => {
    const body = new FormData();
    body.set('code', code);
    setBusy(true);
    setError('');
    try {
      const result = await mutate<{ recoveryCodes: string[] }>('two-factor/codes/', body, csrf);
      setCodes(result.recoveryCodes);
      setAsking(false);
      setCode('');
      void status.refetch();
    } catch (failure) {
      setError(staffMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const low = (status.data?.remaining ?? 10) <= 3;
  return (
    <section className={ui.card} aria-labelledby="two-factor-title">
      <div className={ui.row}>
        <span className={ui.iconTile}>
          <ShieldCheck size={18} aria-hidden />
        </span>
        <div className={ui.stack}>
          <Text variant="title3" id="two-factor-title">
            Two-factor sign-in
          </Text>
          <Text variant="footnote" tone="secondary">
            {status.data ? `On since ${formatDate(status.data.since)}. ` : ''}
            {status.data &&
              `${status.data.remaining} recovery ${status.data.remaining === 1 ? 'code' : 'codes'} left.`}
          </Text>
        </div>
      </div>
      {status.data && low && !codes.length && (
        <InlineAlert message="You’re running low on recovery codes. Make a new set and keep it somewhere safe." />
      )}
      {codes.length > 0 ? (
        <div className={ui.stack}>
          <Text variant="callout">
            Your new recovery codes. Each works once. Save them now: they won’t be shown again, and
            your old ones no longer work.
          </Text>
          <ol className={s.codes}>
            {codes.map(value => (
              <li key={value}>{value.replace(/(.{4})(?=.)/g, '$1-')}</li>
            ))}
          </ol>
          <div className={ui.actions}>
            <Button
              label="Copy all"
              variant="secondary"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(codes.join('\n'))}
            />
            <Button label="I’ve saved them" size="sm" onClick={() => setCodes([])} />
          </div>
        </div>
      ) : asking ? (
        <form
          className={s.form}
          onSubmit={event => {
            event.preventDefault();
            void replace();
          }}
        >
          <label className={s.label}>
            <span>Current code from your authenticator</span>
            <input
              className={s.input}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </label>
          {error && <InlineAlert message={error} />}
          <div className={ui.actions}>
            <Button
              label="Make new codes"
              type="submit"
              size="sm"
              loading={busy}
              disabled={code.length !== 6}
            />
            <Button label="Cancel" variant="quiet" size="sm" onClick={() => setAsking(false)} />
          </div>
        </form>
      ) : (
        <div>
          <Button
            label="Make new recovery codes"
            variant="secondary"
            size="sm"
            onClick={() => setAsking(true)}
          />
        </div>
      )}
    </section>
  );
}
