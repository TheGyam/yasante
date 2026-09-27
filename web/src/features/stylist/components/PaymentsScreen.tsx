import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Page } from '@/shared/ui/Page';
import { Text } from '@/shared/ui/Text';
import { useUpdateProfile } from '../hooks';
import type { PaymentMethod, StylistProfile } from '../types';
import * as styles from './StudioScreens.css';

/** The usual ways a braider is paid, with what each one needs. As the app's. */
const KINDS = [
  { label: 'Bank transfer', placeholder: 'A. Owusu · 12-34-56 · 12345678' },
  { label: 'Monzo', placeholder: 'monzo.me/amaowusu' },
  { label: 'Revolut', placeholder: 'revolut.me/amaowusu' },
  { label: 'PayPal', placeholder: 'paypal.me/amaowusu' },
] as const;

const MAX = 5;

/**
 * How clients pay her deposits. Sent only to a client she's accepted; Yasante never
 * handles the money.
 */
export function PaymentsScreen({
  accountId,
  profile,
}: {
  accountId: string;
  profile: StylistProfile;
}) {
  const save = useUpdateProfile(accountId);
  const [methods, setMethods] = useState<PaymentMethod[]>(() =>
    (profile.paymentMethods ?? []).map(({ label, details }) => ({ label, details }))
  );
  const change = (index: number, changes: Partial<PaymentMethod>) =>
    setMethods(all => all.map((m, i) => (i === index ? { ...m, ...changes } : m)));
  const complete = methods.filter(m => m.label.trim() && m.details.trim());

  return (
    <Page title="Getting paid">
      <div className={styles.form}>
        <div>
          <Text variant="title1">Getting paid</Text>
          <Text variant="subhead" tone="secondary">
            How clients pay your deposits. They see these only once you’ve accepted them, and pay
            you directly — Yasante never handles this money.
          </Text>
        </div>

        {methods.map((method, index) => (
          <Glass key={index} padded radius="xl" className={styles.card}>
            <div className={styles.option}>
              <Input
                label="Name"
                value={method.label}
                placeholder="Monzo"
                onChange={e => change(index, { label: e.target.value })}
              />
              <span />
              <Button
                label="Remove"
                icon={X}
                variant="ghost"
                size="sm"
                onClick={() => setMethods(all => all.filter((_, i) => i !== index))}
              />
            </div>
            <Input
              label="Details"
              value={method.details}
              placeholder={
                KINDS.find(k => k.label === method.label)?.placeholder ?? 'Where to send it'
              }
              onChange={e => change(index, { details: e.target.value })}
            />
          </Glass>
        ))}

        {methods.length < MAX && (
          <div className={styles.group}>
            <Text variant="footnote" tone="secondary">
              Add a way to be paid
            </Text>
            <div className={styles.chips}>
              {KINDS.map(kind => (
                <Chip
                  key={kind.label}
                  label={kind.label}
                  icon={Plus}
                  onClick={() => setMethods(all => [...all, { label: kind.label, details: '' }])}
                />
              ))}
              <Chip
                label="Something else"
                icon={Plus}
                onClick={() => setMethods(all => [...all, { label: '', details: '' }])}
              />
            </div>
          </div>
        )}

        {save.isError && <InlineAlert message={errorMessage(save.error, 'Couldn’t save those.')} />}
        {save.isSuccess && !save.isPending && <InlineAlert tone="success" message="Saved." />}
        <div>
          <Button
            label="Save"
            loading={save.isPending}
            disabled={complete.length !== methods.length}
            onClick={() => save.mutate({ paymentMethods: complete })}
          />
        </div>
      </div>
    </Page>
  );
}
