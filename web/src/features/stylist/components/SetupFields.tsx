import { useEffect, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Building2, Camera, Car, Check, House, LoaderCircle } from 'lucide-react';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Chip } from '@/shared/ui/Chip';
import { Input } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { toHandle } from '../handle';
import type { useHandleAvailability } from '../hooks';
import type { ServiceModel, StylistPolicies } from '../types';
import * as styles from './SetupFields.css';

/** Her page's address, checked as she types, with free alternatives when it's taken. */
export function HandleField({
  value,
  onChange,
  availability,
}: {
  value: string;
  onChange: (handle: string) => void;
  availability: ReturnType<typeof useHandleAvailability>;
}) {
  const { problem, checking, available, suggestions } = availability;
  return (
    <div className={styles.group}>
      <Input
        label="Your page address"
        value={value}
        onChange={event => onChange(toHandle(event.target.value))}
        placeholder="braidsbyama"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={24}
        error={value ? problem : undefined}
        hint={`yasante.com/${value || 'yourname'}`}
      />
      {!problem && !!value && (checking || available !== undefined) && (
        <div className={styles.status} aria-live="polite">
          {checking ? (
            <>
              <LoaderCircle size={14} aria-hidden />
              <Text variant="footnote" tone="tertiary">
                Checking…
              </Text>
            </>
          ) : available ? (
            <>
              <Check size={14} strokeWidth={3} aria-hidden />
              <Text variant="footnote" tone="success">
                {value} is free
              </Text>
            </>
          ) : (
            <Text variant="footnote" tone="danger">
              {value} is taken
            </Text>
          )}
        </div>
      )}
      {available === false && suggestions.length > 0 && (
        <div className={styles.chips}>
          {suggestions.map(suggestion => (
            <Chip key={suggestion} label={suggestion} onClick={() => onChange(suggestion)} />
          ))}
        </div>
      )}
    </div>
  );
}

const MODELS: readonly { value: ServiceModel; label: string; hint: string; icon: LucideIcon }[] = [
  {
    value: 'salon',
    label: 'At a salon',
    hint: 'Clients come to a salon or chair you work from',
    icon: Building2,
  },
  {
    value: 'home',
    label: 'From home',
    hint: 'Clients come to you. Only the district is shown',
    icon: House,
  },
  { value: 'mobile', label: 'I travel', hint: 'You go to the client', icon: Car },
];

/** How and where she works. More than one is normal. */
export function ServiceModelField({
  value,
  onChange,
}: {
  value: ServiceModel[];
  onChange: (models: ServiceModel[]) => void;
}) {
  return (
    <fieldset className={`${styles.group} ${styles.fieldset}`}>
      <legend className={styles.label}>Where you do hair — pick all that apply</legend>
      {MODELS.map(({ value: model, label, hint, icon: Icon }) => {
        const on = value.includes(model);
        return (
          <label key={model} className={`${styles.option} ${on ? styles.optionOn : ''}`}>
            <input
              type="checkbox"
              className={styles.hidden}
              checked={on}
              onChange={() => onChange(on ? value.filter(m => m !== model) : [...value, model])}
            />
            <span className={`${styles.optionIcon} ${on ? styles.optionIconOn : ''}`}>
              <Icon size={18} strokeWidth={2.1} aria-hidden />
            </span>
            <span className={styles.optionText}>
              <Text variant="callout">{label}</Text>
              <Text variant="footnote" tone="secondary">
                {hint}
              </Text>
            </span>
            {on && <Check size={18} strokeWidth={2.6} aria-hidden />}
          </label>
        );
      })}
    </fieldset>
  );
}

const NOTICE = [
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '2 days' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: 'A week' },
];

const DEPOSITS = [
  { value: 'none', label: 'None' },
  { value: 'fixed', label: 'A set amount' },
  { value: 'percent', label: 'A share' },
] as const;

/** Her rules: the questions she answers in DMs every week, answered once. */
export function PolicyFields({
  value,
  onChange,
}: {
  value: StylistPolicies;
  onChange: (policies: StylistPolicies) => void;
}) {
  const set = (changes: Partial<StylistPolicies>) => onChange({ ...value, ...changes });
  return (
    <div className={styles.fields}>
      <div className={styles.group}>
        <span className={styles.label}>Cancelling is free up to</span>
        <div className={styles.chips}>
          {NOTICE.map(option => (
            <Chip
              key={option.hours}
              label={option.label}
              selected={value.noticeHours === option.hours}
              onClick={() => set({ noticeHours: option.hours })}
            />
          ))}
        </div>
        <Text variant="caption" tone="tertiary">
          Before that, a client can cancel with no mark on their record.
        </Text>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Deposit to hold a slot</span>
        <div className={styles.chips}>
          {DEPOSITS.map(option => (
            <Chip
              key={option.value}
              label={option.label}
              selected={value.depositType === option.value}
              onClick={() => set({ depositType: option.value })}
            />
          ))}
        </div>
        {value.depositType !== 'none' && (
          <Input
            label={value.depositType === 'fixed' ? 'Amount (£)' : 'Share of the price (%)'}
            placeholder={value.depositType === 'fixed' ? '20' : '20'}
            inputMode="decimal"
            value={value.depositAmount ? String(value.depositAmount) : ''}
            onChange={event =>
              set({ depositAmount: Number(event.target.value.replace(/[^\d.]/g, '')) || 0 })
            }
          />
        )}
        <Text variant="caption" tone="tertiary">
          Clients pay you directly, with your own details. Yasante never handles this money.
        </Text>
      </div>

      <Checkbox
        checked={value.rescheduleFreeOnce ?? true}
        onChange={on => set({ rescheduleFreeOnce: on })}
      >
        <Text variant="callout" as="span">
          First change of date is free
        </Text>
        <Text variant="footnote" tone="secondary" as="span" className={styles.block}>
          A second counts as a cancellation
        </Text>
      </Checkbox>
    </div>
  );
}

/** One photo she took of her own work. Only Yasante sees it. */
export function ProofPhotoField({
  file,
  saved,
  onChange,
}: {
  file?: File;
  /** A photo already on her page. */
  saved?: boolean;
  onChange: (file: File) => void;
}) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const has = !!file || saved;
  return (
    <div className={styles.group}>
      <label className={`${styles.option} ${has ? styles.optionOn : ''}`}>
        <input
          type="file"
          accept="image/*"
          className={styles.hidden}
          onChange={event => {
            const picked = event.target.files?.[0];
            if (picked) onChange(picked);
          }}
        />
        {preview ? (
          <img src={preview} alt="" className={styles.preview} />
        ) : (
          <span className={`${styles.optionIcon} ${has ? styles.optionIconOn : ''}`}>
            {has ? <Check size={18} aria-hidden /> : <Camera size={18} aria-hidden />}
          </span>
        )}
        <span className={styles.optionText}>
          <Text variant="callout">{has ? 'Photo added' : 'Add a photo of your work'}</Text>
          <Text variant="footnote" tone="secondary">
            {has ? 'Choose a different one' : 'Taken by you'}
          </Text>
        </span>
      </label>
      <Text variant="caption" tone="tertiary">
        Only Yasante sees this photo. It’s how we check a page belongs to the person who did the
        work.
      </Text>
    </div>
  );
}
