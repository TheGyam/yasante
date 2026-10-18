import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { Check } from 'lucide-react';
import { useSession } from '@/features/auth';
import { DURATIONS, formatDuration, useMyProfile } from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, Select } from '@/shared/ui/Input';
import { Page } from '@/shared/ui/Page';
import { Rise } from '@/shared/ui/Rise';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useFinishState, useSaveFinishPrice } from '../hooks';
import type { FinishStyle } from '../types';
import * as styles from './FinishScreen.css';

export function FinishScreen() {
  const session = useSession();
  const location = useLocation();
  const { data: profile } = useMyProfile(session?.user.id ?? '');
  const { data, isPending, error } = useFinishState();
  const flash = (location.state as { message?: string } | null)?.message;

  if (isPending) {
    return (
      <Page title="Finish your page">
        <div className={styles.container} aria-busy>
          <Skeleton style={{ height: 48, width: 240, borderRadius: 12 }} />
          <Skeleton style={{ height: 180, borderRadius: 20 }} />
          <Skeleton style={{ height: 100, borderRadius: 20 }} />
          <Skeleton style={{ height: 100, borderRadius: 20 }} />
        </div>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page title="Finish your page">
        <div className={styles.container}>
          <InlineAlert message={errorMessage(error, 'Couldn’t load finish checklist.')} />
        </div>
      </Page>
    );
  }

  const allPriced = data.styles.length === 0 || data.styles.every(s => s.priced);
  const doneCount = [allPriced, data.hoursSet, data.tagsChecked].filter(Boolean).length;

  if (data.done) {
    return (
      <Page title="Finish your page">
        <Rise className={styles.container}>
          <Glass padded radius="xl" className={styles.doneCard}>
            <Check size={44} className={styles.checkIcon} aria-hidden />
            <Text variant="title1">
              You're taking bookings. Everyone on your waitlist has been told.
            </Text>
            {profile?.handle && (
              <Button label="See your page" to={`/${profile.handle}`} size="md" />
            )}
          </Glass>
        </Rise>
      </Page>
    );
  }

  return (
    <Page title="Finish your page">
      <Rise className={styles.container}>
        <div className={styles.head}>
          <Text variant="title1">Finish your page</Text>
          <Text variant="subhead" tone="secondary">
            {doneCount} of 3 done
          </Text>
        </div>

        {flash && <InlineAlert tone="success" message={flash} />}

        <div className={styles.section}>
          <Glass padded radius="xl" className={styles.styleCard}>
            <div className={styles.cardHeader}>
              <div>
                <Text variant="title3">Price your styles</Text>
                <Text variant="footnote" tone="secondary">
                  One question per style from your photos
                </Text>
              </div>
              {allPriced && <Check size={20} className={styles.checkIcon} aria-label="Completed" />}
            </div>

            {data.styles.map(style => (
              <StylePricingCard key={style.slug} item={style} />
            ))}
          </Glass>

          <Glass padded radius="xl" className={styles.styleCard}>
            <div className={styles.cardHeader}>
              <div>
                <Text variant="title3">Set your hours</Text>
                <Text variant="footnote" tone="secondary">
                  When you take appointments
                </Text>
              </div>
              {data.hoursSet && (
                <Check size={20} className={styles.checkIcon} aria-label="Completed" />
              )}
            </div>
            <div>
              <Button
                label="Set your hours"
                variant={data.hoursSet ? 'ghost' : 'secondary'}
                size="md"
                to="/availability"
              />
            </div>
          </Glass>

          <Glass padded radius="xl" className={styles.styleCard}>
            <div className={styles.cardHeader}>
              <div>
                <Text variant="title3">Check your tags</Text>
                <Text variant="footnote" tone="secondary">
                  We tagged your photos for you. Fix any we got wrong.
                </Text>
              </div>
              {data.tagsChecked && (
                <Check size={20} className={styles.checkIcon} aria-label="Completed" />
              )}
            </div>
            <div>
              <Button
                label="Check your tags"
                variant={data.tagsChecked ? 'ghost' : 'secondary'}
                size="md"
                to="/portfolio"
              />
            </div>
          </Glass>
        </div>
      </Rise>
    </Page>
  );
}

function StylePricingCard({ item }: { item: FinishStyle }) {
  const save = useSaveFinishPrice();
  const [price, setPrice] = useState('');
  const [fromPrice, setFromPrice] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [error, setError] = useState<string>();

  if (item.priced) {
    return (
      <div className={styles.tickedRow}>
        <Check size={18} className={styles.checkIcon} aria-hidden />
        <Text variant="callout">
          {item.name} · {item.photoCount} {item.photoCount === 1 ? 'photo' : 'photos'}
        </Text>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const num = Number(price.replace(/[^\d.]/g, ''));
    if (!num || num <= 0) {
      setError('Add a price');
      return;
    }
    setError(undefined);
    save.mutate(
      {
        style: item.slug,
        price: num,
        fromPrice,
        durationMinutes: minutes || null,
      },
      {
        onError: err => setError(errorMessage(err, 'Couldn’t save price.')),
      }
    );
  };

  return (
    <form className={styles.priceForm} onSubmit={submit} noValidate>
      <Text variant="callout">
        {item.photoCount} of your photos {item.photoCount === 1 ? 'is' : 'are'} {item.name}. What do
        you charge?
      </Text>

      {error && <InlineAlert message={error} />}

      <Input
        label="Price (£)"
        inputMode="decimal"
        placeholder="120"
        value={price}
        onChange={e => setPrice(e.target.value)}
      />

      <Checkbox checked={fromPrice} onChange={setFromPrice}>
        <Text variant="callout" as="span">
          This is a starting price
        </Text>
      </Checkbox>

      <Select
        label="How long it takes"
        value={minutes}
        onChange={e => setMinutes(Number(e.target.value))}
      >
        <option value={0}>Not saying</option>
        {DURATIONS.map(m => (
          <option key={m} value={m}>
            {formatDuration(m)}
          </option>
        ))}
      </Select>

      <div>
        <Button
          type="submit"
          label="Save price"
          size="md"
          loading={save.isPending}
          disabled={save.isPending}
        />
      </div>
    </form>
  );
}
