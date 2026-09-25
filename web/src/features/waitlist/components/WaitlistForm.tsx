import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, Select } from '@/shared/ui/Input';
import { Rise } from '@/shared/ui/Rise';
import { Text } from '@/shared/ui/Text';
import { joinWaitlist } from '../api';
import type { WaitlistRole } from '../types';
import * as styles from './WaitlistForm.css';

export interface WaitlistFormProps {
  /** Where they came from (a stylist's page, a campaign), kept with the entry. */
  source?: string;
}

/** An email for when Yasante opens near them. */
export function WaitlistForm({ source }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WaitlistRole>('client');
  const [area, setArea] = useState('');
  const [trap, setTrap] = useState('');
  const join = useMutation({ mutationFn: joinWaitlist });

  if (join.isSuccess) {
    return (
      <Rise className={styles.done}>
        <Text variant="title3" as="p">
          You’re on the list.
        </Text>
        <Text variant="subhead" tone="secondary">
          We’ll email {email.trim()} when Yasante opens near you.
        </Text>
      </Rise>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    join.mutate({
      email: email.trim(),
      role,
      area: area.trim(),
      source: source ?? '',
      website: trap,
    });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate={false}>
      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={event => setEmail(event.target.value)}
      />
      <div className={styles.row}>
        <Select
          label="I’m"
          value={role}
          onChange={event => setRole(event.target.value as WaitlistRole)}
        >
          <option value="client">getting my hair done</option>
          <option value="stylist">a stylist</option>
        </Select>
        <Input
          label="Area (optional)"
          name="area"
          placeholder="Peckham"
          autoComplete="address-level2"
          value={area}
          onChange={event => setArea(event.target.value)}
        />
      </div>
      <div className={styles.trap} aria-hidden>
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={trap}
            onChange={event => setTrap(event.target.value)}
          />
        </label>
      </div>
      {join.isError && (
        <InlineAlert
          message={errorMessage(join.error, 'Couldn’t add you to the list. Please try again.')}
        />
      )}
      <div>
        <Button type="submit" label="Join the waitlist" loading={join.isPending} />
      </div>
    </form>
  );
}
