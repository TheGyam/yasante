import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/shared/ui/Button';
import { Input, TextArea } from '@/shared/ui/Input';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Text } from '@/shared/ui/Text';
import { staffMessage, useFeaturedWrite } from '../../hooks';
import type { FeaturedDetail } from '../../types';
import { FileField } from '../fields/FileField';
import * as s from './Featured.css';

/** Accept the Instagram or TikTok address staff paste, retaining only its handle. */
export function socialHandle(input: string) {
  const text = input.trim();
  const address = text.match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|tiktok\.com)\/@?([^/?#]+)/i
  );
  return (address?.[1] ?? text).replace(/^@/, '').toLowerCase();
}
/** Kept for anything still calling it by its old name. */
export const instagramHandle = socialHandle;

type Where = 'instagram' | 'tiktok' | 'both';
const WHERE: { key: Where; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'both', label: 'Both' },
];

export function Details({ csrf, page }: { csrf: string; page?: FeaturedDetail }) {
  const navigate = useNavigate();
  const write = useFeaturedWrite(csrf);
  const [error, setError] = useState('');
  const [where, setWhere] = useState<Where>(
    page?.tiktok_handle ? (page.instagram_handle ? 'both' : 'tiktok') : 'instagram'
  );
  const [instagram, setInstagram] = useState(page?.instagram_handle ?? '');
  const [tiktok, setTiktok] = useState(page?.tiktok_handle ?? '');
  const onInstagram = where !== 'tiktok';
  const onTiktok = where !== 'instagram';
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (write.isPending) return;
    const body = new FormData(event.currentTarget);
    if (!page?.live) {
      // Only the places they're on: switching to TikTok alone clears Instagram.
      body.set('instagram_handle', onInstagram ? socialHandle(instagram) : '');
      body.set('tiktok_handle', onTiktok ? socialHandle(tiktok) : '');
    }
    // An empty file input is not an uploaded photo.
    if (!(body.get('avatar') instanceof File) || !(body.get('avatar') as File).size)
      body.delete('avatar');
    setError('');
    try {
      const result = await write.mutateAsync({
        path: page ? `featured/${page.id}/` : 'featured/',
        body,
        method: page ? 'PATCH' : 'POST',
      });
      if (!page && 'id' in result) navigate(`/featured/${result.id}`);
    } catch (failure) {
      setError(staffMessage(failure));
    }
  };
  const locked = !!page?.live;
  const lead = onInstagram ? socialHandle(instagram) : socialHandle(tiktok);
  const note = (value: string, other: string) =>
    locked
      ? 'Locked while the page is live'
      : socialHandle(value) && socialHandle(value) === lead && socialHandle(value) !== value.trim()
        ? `Saved as @${lead}, which is also their Yasante address.`
        : `Paste @handle or ${other} link.`;
  return (
    <form onSubmit={event => void save(event)}>
      <fieldset className={s.fields} disabled={write.isPending || !!page?.claimed_at}>
        <fieldset className={s.group} disabled={locked}>
          <legend className={s.label}>Where are they?</legend>
          <div className={s.chips} role="radiogroup" aria-label="Where are they?">
            {WHERE.map(option => (
              <label key={option.key} className={s.chip}>
                <input
                  className={s.chipInput}
                  type="radio"
                  name="where"
                  checked={where === option.key}
                  onChange={() => setWhere(option.key)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className={s.twoUp}>
          {onInstagram && (
            <Input
              label="Instagram handle"
              value={instagram}
              onChange={event => setInstagram(event.target.value)}
              disabled={locked}
              required={!locked}
              maxLength={200}
              placeholder="@theirhandle"
              error={!page && !onTiktok ? error : undefined}
              hint={note(instagram, 'an instagram.com')}
            />
          )}
          {onTiktok && (
            <Input
              label="TikTok handle"
              value={tiktok}
              onChange={event => setTiktok(event.target.value)}
              disabled={locked}
              required={!locked}
              maxLength={200}
              placeholder="@theirhandle"
              error={!page ? error : undefined}
              hint={note(tiktok, 'a tiktok.com')}
            />
          )}
        </div>
        <div className={s.twoUp}>
          <Input
            label="Name"
            name="display_name"
            defaultValue={page?.display_name}
            required
            maxLength={150}
            placeholder="As it is on their profile"
          />
          <Input
            label="Area"
            name="base_area"
            defaultValue={page?.base_area}
            required
            maxLength={100}
            placeholder="Peckham"
          />
        </div>
        <FileField
          field={{ name: 'avatar', label: 'Photo (optional)', kind: 'file', value: '', errors: [] }}
          common={{ name: 'avatar', label: 'Photo (optional)' }}
        />
        <TextArea
          label="Bio (optional)"
          name="bio"
          defaultValue={page?.bio}
          maxLength={1000}
          hint="Their own words from their profile, if they have one."
        />
        {page && error && <InlineAlert message={error} />}
        <div className={s.composerFooter}>
          {write.isSuccess && page && (
            <Text role="status" tone="secondary">
              Details saved.
            </Text>
          )}
          <Button
            label={write.isPending ? 'Saving…' : page ? 'Save details' : 'Add a featured stylist'}
            type="submit"
            loading={write.isPending}
          />
        </div>
      </fieldset>
    </form>
  );
}
