import { useState } from 'react';
import { CalendarDays, MapPin, Store, Wallet } from 'lucide-react';
import { SignedInAs } from '@/features/auth';
import { hoursLabel, useMyProfile, useUpdateProfile } from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import * as styles from './Studio.css';

/** Her page's settings: the page itself, hours, getting paid, and her address. */
export function AccountScreen({ accountId }: { accountId: string }) {
  const { data: profile } = useMyProfile(accountId);
  const save = useUpdateProfile(accountId);
  const [address, setAddress] = useState(profile?.address ?? '');
  if (!profile) return null;
  const clientsCome = profile.serviceModels.some(m => m === 'home' || m === 'salon');

  return (
    <Page title="Account">
      <div className={styles.form}>
        <Text variant="title1">Account</Text>
        <Section>
          <ListRow
            icon={Store}
            title="Edit your page"
            subtitle="Name, bio, area and your terms"
            to="/stylist-setup"
          />
          <ListRow
            icon={CalendarDays}
            iconTone="neutral"
            title="Working hours"
            subtitle={hoursLabel(profile.availability) ?? 'Not set yet'}
            to="/availability"
          />
          <ListRow
            icon={Wallet}
            iconTone="neutral"
            title="Getting paid"
            subtitle={
              profile.paymentMethods?.length
                ? profile.paymentMethods.map(m => m.label).join(', ')
                : 'Where clients send deposits'
            }
            to="/payment-methods"
          />
        </Section>

        {clientsCome && (
          <Glass padded radius="xl" className={styles.card}>
            <Text variant="overline" tone="tertiary" as="h2">
              Where clients come
            </Text>
            <Input
              label="Your address"
              value={address}
              autoComplete="street-address"
              placeholder="12 Bellenden Road, Peckham, SE15"
              hint="Shared only with a client whose appointment is confirmed. Your page shows your district."
              onChange={e => setAddress(e.target.value)}
            />
            {save.isError && (
              <InlineAlert message={errorMessage(save.error, 'Couldn’t save it.')} />
            )}
            {save.isSuccess && <InlineAlert tone="success" message="Saved." />}
            <div>
              <Button
                label="Save address"
                icon={MapPin}
                size="md"
                variant="secondary"
                disabled={address.trim() === (profile.address ?? '')}
                loading={save.isPending}
                onClick={() => save.mutate({ address: address.trim() })}
              />
            </div>
          </Glass>
        )}

        <Text variant="footnote" tone="secondary">
          When the Yasante app is in your app store, sign in with the same email and password:
          everything here is already there.
        </Text>
        <SignedInAs />
      </div>
    </Page>
  );
}
