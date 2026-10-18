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

/** Accept the Instagram address staff paste, retaining only its handle. */
export function instagramHandle(input: string) {
  const text = input.trim();
  const address = text.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i);
  return (address?.[1] ?? text).replace(/^@/, '').toLowerCase();
}

export function Details({ csrf, page }: { csrf: string; page?: FeaturedDetail }) {
  const navigate = useNavigate();
  const write = useFeaturedWrite(csrf);
  const [error, setError] = useState('');
  const [handle, setHandle] = useState(page?.instagram_handle ?? '');
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (write.isPending) return;
    const body = new FormData(event.currentTarget);
    body.set(
      'instagram_handle',
      instagramHandle(String(body.get('instagram_handle') ?? page?.instagram_handle ?? ''))
    );
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
  const cleaned = instagramHandle(handle);
  return (
    <form onSubmit={event => void save(event)}>
      <fieldset className={s.fields} disabled={write.isPending || !!page?.claimed_at}>
        <Input
          label="Instagram handle"
          name="instagram_handle"
          value={handle}
          onChange={event => setHandle(event.target.value)}
          disabled={page?.live}
          required={!page?.live}
          maxLength={200}
          placeholder="@theirhandle or instagram.com/theirhandle"
          error={!page ? error : undefined}
          hint={
            page?.live
              ? 'Locked while the page is live'
              : cleaned && cleaned !== handle.trim()
                ? `Saved as @${cleaned}, which is also their Yasante address.`
                : 'Paste @handle or an instagram.com link.'
          }
        />
        <div className={s.twoUp}>
          <Input
            label="Name"
            name="display_name"
            defaultValue={page?.display_name}
            required
            maxLength={150}
            placeholder="As it is on their Instagram"
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
          hint="Their own words from their Instagram bio, if they have one."
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
