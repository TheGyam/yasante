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
  return (
    <form onSubmit={event => void save(event)}>
      <fieldset className={s.fields} disabled={write.isPending || !!page?.claimed_at}>
        <Input
          label="Name"
          name="display_name"
          defaultValue={page?.display_name}
          required
          maxLength={150}
        />
        <Input
          label="Instagram handle"
          name="instagram_handle"
          defaultValue={page?.instagram_handle}
          disabled={page?.live}
          required={!page?.live}
          maxLength={200}
          error={!page ? error : undefined}
          hint={
            page?.live ? 'Locked while the page is live' : 'Paste @handle or an instagram.com link.'
          }
        />
        <Input
          label="Area"
          name="base_area"
          defaultValue={page?.base_area}
          required
          maxLength={100}
        />
        <TextArea label="Bio (optional)" name="bio" defaultValue={page?.bio} maxLength={1000} />
        <FileField
          field={{ name: 'avatar', label: 'Photo (optional)', kind: 'file', value: '', errors: [] }}
          common={{ name: 'avatar', label: 'Photo (optional)' }}
        />
        {page && error && <InlineAlert message={error} />}
        <Button
          label={write.isPending ? 'Saving…' : page ? 'Save details' : 'Add a featured stylist'}
          type="submit"
          loading={write.isPending}
        />
        {write.isSuccess && page && <Text role="status">Details saved.</Text>}
      </fieldset>
    </form>
  );
}
