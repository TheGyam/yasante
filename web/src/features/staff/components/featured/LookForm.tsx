import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react';
import { HAIR_TEXTURES } from '@/features/looks';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, TextArea } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';
import { staffMessage, useFeaturedWrite, useStaffRead } from '../../hooks';
import type { Records } from '../../types';
import * as ui from '../ui.css';
import * as s from './Featured.css';

const MAX = 5;

function Preview({ file, alt }: { file: File; alt: string }) {
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
  return uri ? (
    <img className={s.thumbImage} src={uri} alt={alt} />
  ) : (
    <span className={s.thumbImage} />
  );
}

/**
 * One look: its photos (dropped, chosen, or pasted straight from a copied Instagram
 * photo), what style it is and the hair it's on. Stays open after saving, so adding
 * the next look is one step.
 */
export function LookForm({
  id,
  csrf,
  onClose,
}: {
  id: string;
  csrf: string;
  onClose?: () => void;
}) {
  const write = useFeaturedWrite(csrf);
  const inputId = useId();
  const [photos, setPhotos] = useState<File[]>([]);
  const [selected, setSelected] = useState<{ slug: string; name: string }[]>([]);
  const [hair, setHair] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [over, setOver] = useState(false);
  const search = useDebouncedValue(term, 200);
  const styles = useStaffRead<Records>(
    `records/looks/style/?name__icontains=${encodeURIComponent(search)}&p=${page}`
  );
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const dragging = useRef<number | null>(null);

  const add = (files: File[]) => {
    setSaved(false);
    if (!files.length) return;
    if (files.some(file => !file.type.startsWith('image/'))) {
      setError('Choose photos to add to this look.');
      return;
    }
    if (photos.length + files.length > MAX) {
      setError('Add 1 to 5 photos');
      return;
    }
    setPhotos(current => [...current, ...files]);
    setError('');
  };
  // Copy a photo on Instagram, then paste it here: no saving to the computer first.
  const addRef = useRef(add);
  useEffect(() => {
    addRef.current = add;
  });
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter(file =>
        file.type.startsWith('image/')
      );
      if (!files.length) return;
      event.preventDefault();
      addRef.current(files);
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, []);

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
    body.set('hair_texture', hair);
    photos.forEach(file => body.append('files', file));
    selected.forEach(style => body.append('styles', style.slug));
    setError('');
    setSaved(false);
    try {
      await write.mutateAsync({ path: `featured/${id}/looks/`, body });
      setPhotos([]);
      setSelected([]);
      setHair('');
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
  const toggle = (slug: string, name: string, on: boolean) =>
    setSelected(on ? [...selected, { slug, name }] : selected.filter(item => item.slug !== slug));

  return (
    <form onSubmit={event => void save(event)} className={s.composer} aria-label="Add a look">
      <div className={s.composerHead}>
        <Text variant="title3">Add a look</Text>
        <span className={ui.muted}>One post from their Instagram, up to 5 photos</span>
      </div>
      <fieldset className={s.fields} disabled={write.isPending}>
        <div
          className={`${s.drop} ${photos.length ? s.dropSmall : ''}`}
          data-over={over}
          onDragOver={event => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={event => {
            event.preventDefault();
            setOver(false);
            if (!write.isPending && dragging.current === null)
              add(Array.from(event.dataTransfer.files));
          }}
        >
          {!photos.length && <ImagePlus className={s.dropIcon} size={28} aria-hidden />}
          <span>
            {photos.length >= MAX
              ? 'That’s 5, the most a look can have.'
              : photos.length
                ? 'Add more: drop, paste or '
                : 'Drop their photos here, paste one you’ve copied, or '}
            {photos.length < MAX && (
              <label htmlFor={inputId} className={s.chooseLink}>
                Choose photos
              </label>
            )}
          </span>
          <input
            id={inputId}
            className={s.hiddenInput}
            type="file"
            accept="image/*"
            multiple
            onChange={event => {
              add(Array.from(event.target.files ?? []));
              event.target.value = '';
            }}
          />
        </div>

        {!!photos.length && (
          <div className={ui.stack}>
            <span className={s.hint}>Drag to change the order. The first is the cover.</span>
            <div className={s.thumbs}>
              {photos.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${file.size}-${index}`}
                  className={s.thumb}
                  data-cover={index === 0}
                  draggable={!write.isPending}
                  onDragStart={() => {
                    dragging.current = index;
                  }}
                  onDragEnd={() => {
                    dragging.current = null;
                  }}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (dragging.current !== null) move(dragging.current, index);
                    dragging.current = null;
                  }}
                >
                  <Preview file={file} alt={file.name} />
                  {index === 0 && <span className={`${s.photoCount} ${s.thumbBadge}`}>Cover</span>}
                  <div className={s.thumbActions}>
                    {index > 0 && (
                      <button
                        type="button"
                        className={s.iconButton}
                        aria-label={`Move photo ${index + 1} earlier`}
                        title={`Move photo ${index + 1} earlier`}
                        onClick={() => move(index, index - 1)}
                      >
                        <ArrowLeft size={14} aria-hidden />
                      </button>
                    )}
                    {index < photos.length - 1 && (
                      <button
                        type="button"
                        className={s.iconButton}
                        aria-label={`Move photo ${index + 1} later`}
                        title={`Move photo ${index + 1} later`}
                        onClick={() => move(index, index + 1)}
                      >
                        <ArrowRight size={14} aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      className={s.iconButton}
                      aria-label={`Remove photo ${index + 1}`}
                      title={`Remove photo ${index + 1}`}
                      onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <fieldset className={s.group}>
          <legend className={s.label}>Style</legend>
          {/* Picked styles stay in sight while a search hides them from the list. */}
          {!!selected.length && !!term.trim() && (
            <div className={s.chips} role="group" aria-label="Chosen styles">
              {selected.map(style => (
                <button
                  key={style.slug}
                  type="button"
                  className={s.chip}
                  data-on="true"
                  aria-label={`Remove ${style.name}`}
                  title={`Remove ${style.name}`}
                  onClick={() => toggle(style.slug, style.name, false)}
                >
                  {style.name} <X size={12} aria-hidden />
                </button>
              ))}
            </div>
          )}
          <Input
            label="Find a style"
            type="search"
            value={term}
            placeholder="Knotless, locs, silk press…"
            hint={selected.length ? `${selected.length} of 3 picked` : 'Pick up to 3 styles'}
            onChange={event => {
              setTerm(event.target.value);
              setPage(1);
            }}
          />
          {styles.isError ? (
            <InlineAlert message={staffMessage(styles.error)} />
          ) : (
            <div className={s.chips}>
              {styles.data?.rows.map(row => {
                const slug = row.values[slugIndex];
                const name = row.values[nameIndex];
                if (!slug || !name) return null;
                const checked = selected.some(item => item.slug === slug);
                return (
                  <label key={slug} className={s.chip}>
                    <input
                      className={s.chipInput}
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && selected.length >= 3}
                      onChange={event => toggle(slug, name, event.target.checked)}
                    />
                    {name}
                  </label>
                );
              })}
            </div>
          )}
          {styles.data && !styles.data.rows.length && (
            <Text tone="secondary">No styles match. Try another name.</Text>
          )}
          {styles.data && styles.data.pages > 1 && (
            <div className={ui.actions}>
              <Button
                label="Previous styles"
                size="sm"
                variant="quiet"
                disabled={page <= 1 || styles.isFetching}
                onClick={() => setPage(page - 1)}
              />
              <Button
                label="Next styles"
                size="sm"
                variant="quiet"
                disabled={page >= styles.data.pages || styles.isFetching}
                onClick={() => setPage(page + 1)}
              />
            </div>
          )}
        </fieldset>

        <fieldset className={s.group}>
          <legend className={s.label}>
            Hair type <span className={s.hint}>Leave it if you can’t tell</span>
          </legend>
          <div className={s.chips} role="radiogroup" aria-label="Hair type">
            {[{ id: '', name: 'Not sure' }, ...HAIR_TEXTURES].map(option => (
              <label key={option.id || 'none'} className={s.chip}>
                <input
                  className={s.chipInput}
                  type="radio"
                  name="hair_choice"
                  checked={hair === option.id}
                  onChange={() => setHair(option.id)}
                />
                {option.name}
              </label>
            ))}
          </div>
        </fieldset>

        <TextArea
          label="Caption (optional)"
          name="caption"
          maxLength={1000}
          hint="Their own words from the post work well."
        />
        {error && <InlineAlert message={error} />}
        {saved && <Text role="status">Look saved. Add the next look.</Text>}
        <div className={s.composerFooter}>
          {onClose && (
            <Button label={saved ? 'Done' : 'Cancel'} variant="secondary" onClick={onClose} />
          )}
          <Button
            label={write.isPending ? 'Saving…' : 'Save look'}
            type="submit"
            disabled={!photos.length || !selected.length}
            loading={write.isPending}
          />
        </div>
      </fieldset>
    </form>
  );
}
