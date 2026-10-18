import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HAIR_TEXTURES } from '@/features/looks';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, Select, TextArea } from '@/shared/ui/Input';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { staffMessage, useFeaturedWrite, useStaffRead } from '../../hooks';
import type { Records } from '../../types';
import * as controls from '../controls.css';
import * as ui from '../ui.css';
import * as s from './Featured.css';

function Preview({ file }: { file: File }) {
  const [uri, setUri] = useState('');
  useEffect(() => {
    // The staff site's image policy allows data URLs, not blob URLs.
    const reader = new FileReader();
    reader.onload = () => setUri(String(reader.result));
    reader.readAsDataURL(file);
    return () => {
      reader.onload = null;
      if (reader.readyState === 1) reader.abort();
    };
  }, [file]);
  return <RemoteImage src={uri} alt={file.name} className={s.photo} aspect={1} />;
}

export function LookForm({ id, csrf }: { id: string; csrf: string }) {
  const write = useFeaturedWrite(csrf);
  const [photos, setPhotos] = useState<File[]>([]);
  const [selected, setSelected] = useState<{ slug: string; name: string }[]>([]);
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(term, 200);
  const styles = useStaffRead<Records>(
    `records/looks/style/?name__icontains=${encodeURIComponent(search)}&p=${page}`
  );
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const dragging = useRef<number | null>(null);
  const add = (files: File[]) => {
    setSaved(false);
    if (photos.length + files.length > 5) {
      setError('Add 1 to 5 photos');
      return;
    }
    if (files.some(file => !file.type.startsWith('image/'))) {
      setError('Choose photos to add to this look.');
      return;
    }
    setPhotos([...photos, ...files]);
    setError('');
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || write.isPending) return;
    const next = [...photos];
    const [photo] = next.splice(from, 1);
    next.splice(to, 0, photo);
    setPhotos(next);
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (write.isPending) return;
    if (!photos.length || !selected.length) {
      setError(!photos.length ? 'Add 1 to 5 photos' : 'Tag the style');
      return;
    }
    const form = event.currentTarget;
    const body = new FormData(form);
    photos.forEach(file => body.append('files', file));
    selected.forEach(style => body.append('styles', style.slug));
    setError('');
    setSaved(false);
    try {
      await write.mutateAsync({ path: `featured/${id}/looks/`, body });
      setPhotos([]);
      setSelected([]);
      setTerm('');
      setPage(1);
      form.reset();
      setSaved(true);
    } catch (failure) {
      setError(staffMessage(failure));
    }
  };
  const nameIndex = styles.data?.columns.findIndex(column => column.key === 'name') ?? -1;
  const slugIndex = styles.data?.columns.findIndex(column => column.key === 'slug') ?? -1;
  return (
    <form onSubmit={event => void save(event)} className={ui.card} aria-label="Add a look">
      <fieldset className={s.fields} disabled={write.isPending}>
        <div
          className={s.drop}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            if (!write.isPending) add(Array.from(event.dataTransfer.files));
          }}
        >
          <Input
            label="Choose photos"
            type="file"
            accept="image/*"
            multiple
            onChange={event => {
              add(Array.from(event.target.files ?? []));
              event.target.value = '';
            }}
            hint="Drop or choose 1 to 5 photos. Drag to reorder; the first is the cover."
          />
          <div className={s.photos}>
            {photos.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${file.size}-${index}`}
                draggable={!write.isPending}
                onDragStart={() => {
                  dragging.current = index;
                }}
                onDragOver={event => event.preventDefault()}
                onDrop={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (dragging.current !== null) move(dragging.current, index);
                  dragging.current = null;
                }}
              >
                <Preview file={file} />
                <Text variant="caption">{index === 0 ? 'Cover' : `Photo ${index + 1}`}</Text>
                <div className={ui.stack}>
                  <Button
                    label={`Move photo ${index + 1} earlier`}
                    size="sm"
                    variant="quiet"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  />
                  <Button
                    label={`Move photo ${index + 1} later`}
                    size="sm"
                    variant="quiet"
                    disabled={index === photos.length - 1}
                    onClick={() => move(index, index + 1)}
                  />
                  <Button
                    label={`Remove photo ${index + 1}`}
                    size="sm"
                    variant="quiet"
                    onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Input
          label="Find a style"
          type="search"
          value={term}
          onChange={event => {
            setTerm(event.target.value);
            setPage(1);
          }}
          hint="Pick up to 3 styles."
        />
        <div className={ui.actions}>
          {selected.map(style => (
            <Button
              key={style.slug}
              label={`Remove ${style.name}`}
              variant="secondary"
              size="sm"
              onClick={() => setSelected(selected.filter(item => item.slug !== style.slug))}
            />
          ))}
        </div>
        {styles.isError ? (
          <InlineAlert message={staffMessage(styles.error)} />
        ) : (
          <div className={controls.choiceList}>
            {styles.data?.rows.map(row => {
              const slug = row.values[slugIndex];
              const name = row.values[nameIndex];
              if (!slug || !name) return null;
              const checked = selected.some(item => item.slug === slug);
              return (
                <Checkbox
                  key={slug}
                  label={name}
                  checked={checked}
                  disabled={!checked && selected.length >= 3}
                  onChange={value =>
                    setSelected(
                      value
                        ? [...selected, { slug, name }]
                        : selected.filter(item => item.slug !== slug)
                    )
                  }
                />
              );
            })}
          </div>
        )}
        {styles.data && !styles.data.rows.length && <Text>No styles match. Try another name.</Text>}
        {styles.data && styles.data.pages > 1 && (
          <div className={ui.actions}>
            <Button
              label="Previous styles"
              size="sm"
              disabled={page <= 1 || styles.isFetching}
              onClick={() => setPage(page - 1)}
            />
            <Text>
              Styles page {page} of {styles.data.pages}
            </Text>
            <Button
              label="Next styles"
              size="sm"
              disabled={page >= styles.data.pages || styles.isFetching}
              onClick={() => setPage(page + 1)}
            />
          </div>
        )}
        <Select label="Hair type" name="hair_texture">
          <option value="">Choose a hair type</option>
          {HAIR_TEXTURES.map(hair => (
            <option key={hair.id} value={hair.id}>
              {hair.name}
            </option>
          ))}
        </Select>
        <TextArea label="Caption (optional)" name="caption" maxLength={1000} />
        {error && <InlineAlert message={error} />}
        {saved && <Text role="status">Look saved. Add the next look.</Text>}
        <Button
          label={write.isPending ? 'Saving…' : 'Save look'}
          type="submit"
          disabled={!photos.length || !selected.length}
          loading={write.isPending}
        />
      </fieldset>
    </form>
  );
}
