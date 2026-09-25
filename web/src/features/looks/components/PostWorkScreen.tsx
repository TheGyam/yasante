import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { ImagePlus, X } from 'lucide-react';
import { useMenu } from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { plural } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, Select } from '@/shared/ui/Input';
import { Page } from '@/shared/ui/Page';
import { Text } from '@/shared/ui/Text';
import { usePostWork, useStyles, type WorkDraft } from '../hooks';
import * as styles from './PostWork.css';

/** As many as the server takes in one go (MAX_PORTFOLIO_BATCH). */
const MAX = 20;
/** The upload limit, so a too-big photo is caught before it's sent. */
const MAX_BYTES = 15 * 1024 * 1024;

interface Chosen extends Omit<WorkDraft, 'file'> {
  key: string;
  file: File;
  preview: string;
}

/**
 * Posting her work: each photo becomes a look in the feed, credited to her, and joins
 * her page. Many at once, so her back catalogue is up before clients arrive.
 */
export function PostWorkScreen({ accountId }: { accountId: string }) {
  const navigate = useNavigate();
  const { data: styleList = [] } = useStyles();
  const { data: menu = [] } = useMenu(accountId);
  const { post, progress, reset } = usePostWork();
  const [picks, setPicks] = useState<Chosen[]>([]);
  const [onPage, setOnPage] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [tooMany, setTooMany] = useState(false);
  const [tooBig, setTooBig] = useState(0);
  const posting = !!progress && progress.done < progress.total;

  // The previews are the browser's copies of her files: let them all go when she leaves.
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach(url => URL.revokeObjectURL(url)), []);
  const previewOf = (file: File) => {
    const url = URL.createObjectURL(file);
    previews.current.push(url);
    return url;
  };

  const add = (files: FileList | File[]) => {
    const images = [...files].filter(f => f.type.startsWith('image/'));
    const fitting = images.filter(f => f.size <= MAX_BYTES);
    setTooBig(images.length - fitting.length);
    const room = MAX - picks.length;
    setTooMany(fitting.length > room);
    const last = picks[picks.length - 1];
    setPicks(current => [
      ...current,
      ...fitting.slice(0, room).map(file => ({
        key: `${file.name}-${file.size}-${Math.random()}`,
        file,
        preview: previewOf(file),
        // Photos in a batch are usually the same kind of work: start from the last one.
        style: last?.style ?? '',
        serviceId: last?.serviceId,
        caption: '',
      })),
    ]);
    reset();
  };

  const change = (key: string, changes: Partial<Chosen>) =>
    setPicks(all => all.map(p => (p.key === key ? { ...p, ...changes } : p)));
  const everyone = (changes: Partial<Chosen>) =>
    setPicks(all => all.map(p => ({ ...p, ...changes })));
  const untagged = picks.filter(p => !p.style).length;

  const submit = async () => {
    const failed = await post(picks, onPage);
    if (!failed.length) {
      navigate('/portfolio', { state: { posted: picks.length } });
      return;
    }
    // Keep only what didn't post, so trying again doesn't post the rest twice.
    const left = new Set(failed.map(f => f.draft));
    setPicks(all => all.filter(p => left.has(p)));
  };

  const styleOptions = useMemo(
    () => styleList.map(s => ({ value: s.id, label: s.name })),
    [styleList]
  );
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    add(event.dataTransfer.files);
  };

  return (
    <Page title="Post your work">
      <div className={styles.column}>
        <div>
          <Text variant="title1">Post your work</Text>
          <Text variant="subhead" tone="secondary">
            Each photo goes into the Yasante feed as a look, credited to you, where clients browsing
            that style find it. Only post your own work, of people happy to be shown.
          </Text>
        </div>

        {picks.length < MAX && !posting && (
          <label
            className={`${styles.drop} ${dragging ? styles.dropping : ''}`}
            onDragOver={event => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className={styles.hidden}
              onChange={event => {
                if (event.target.files) add(event.target.files);
                event.target.value = '';
              }}
            />
            <ImagePlus size={32} aria-hidden />
            <Text variant="bodyStrong">
              {picks.length ? 'Add more photos' : 'Choose photos of your work'}
            </Text>
            <Text variant="footnote" tone="secondary">
              Or drop them here. Up to {MAX} at a time.
            </Text>
          </label>
        )}
        {tooMany && (
          <InlineAlert
            tone="info"
            message={`Up to ${MAX} at a time: post these, then add the rest.`}
          />
        )}
        {tooBig > 0 && (
          <InlineAlert
            message={`${plural(tooBig, 'photo')} ${tooBig === 1 ? 'was' : 'were'} over 15 MB and left out.`}
          />
        )}

        {picks.length > 1 && !posting && (
          <Glass padded radius="xl" className={styles.fields}>
            <Text variant="overline" tone="tertiary" as="h2">
              For all {picks.length} photos
            </Text>
            <div className={styles.row}>
              <Select
                label="Style"
                value=""
                onChange={e => e.target.value && everyone({ style: e.target.value })}
              >
                <option value="">Set every style to…</option>
                {styleOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              {menu.length > 0 && (
                <Select
                  label="Service"
                  value=""
                  onChange={e =>
                    e.target.value &&
                    everyone({ serviceId: e.target.value === 'none' ? undefined : e.target.value })
                  }
                >
                  <option value="">Set every service to…</option>
                  <option value="none">No service</option>
                  {menu.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </Glass>
        )}

        {picks.length > 0 && (
          <div className={styles.photos}>
            {picks.map((pick, index) => (
              <Glass key={pick.key} padded radius="xl" className={styles.photo}>
                <img src={pick.preview} alt={`Photo ${index + 1}`} className={styles.preview} />
                <div className={styles.fields}>
                  <div className={styles.row}>
                    <Select
                      label="Style"
                      value={pick.style}
                      error={!pick.style ? 'Pick the style' : undefined}
                      disabled={posting}
                      onChange={e => change(pick.key, { style: e.target.value })}
                    >
                      <option value="">Choose…</option>
                      {styleOptions.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Service"
                      value={pick.serviceId ?? ''}
                      disabled={posting}
                      hint={
                        menu.length
                          ? 'Shows its name and price with the look'
                          : 'Add services in Menu to link one'
                      }
                      onChange={e => change(pick.key, { serviceId: e.target.value || undefined })}
                    >
                      <option value="">None</option>
                      {menu.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    label="Caption (optional)"
                    value={pick.caption}
                    maxLength={1000}
                    disabled={posting}
                    placeholder="Mid-back knotless, 6 hours, hair included"
                    onChange={e => change(pick.key, { caption: e.target.value })}
                  />
                  {!posting && (
                    <div>
                      <Button
                        label="Remove"
                        icon={X}
                        variant="ghost"
                        size="sm"
                        onClick={() => setPicks(all => all.filter(p => p.key !== pick.key))}
                      />
                    </div>
                  )}
                </div>
              </Glass>
            ))}
          </div>
        )}

        {progress && (
          <div className={styles.fields} aria-live="polite">
            <div className={styles.bar}>
              <div
                className={styles.barFill}
                style={{ transform: `scaleX(${progress.done / progress.total})` }}
              />
            </div>
            <Text variant="footnote" tone="secondary">
              {posting
                ? `Posting ${progress.done + 1} of ${progress.total}…`
                : `Posted ${progress.total - progress.failed.length} of ${progress.total}.`}
            </Text>
            {!posting && progress.failed.length > 0 && (
              <InlineAlert
                message={`${plural(progress.failed.length, 'photo')} didn’t post: ${errorMessage(progress.failed[0].error, 'something went wrong')}. They’re still here to try again.`}
              />
            )}
          </div>
        )}

        {picks.length > 0 && (
          <div className={styles.fields}>
            <Checkbox checked={onPage} onChange={setOnPage}>
              <Text variant="callout" as="span">
                Also show {picks.length === 1 ? 'it' : 'them'} on my page
              </Text>
            </Checkbox>
            <div className={styles.actions}>
              <Button
                label={`Post ${plural(picks.length, 'photo')}`}
                disabled={!!untagged || posting}
                loading={posting}
                onClick={submit}
              />
              {untagged > 0 && (
                <Text variant="footnote" tone="secondary">
                  Pick a style for {plural(untagged, 'photo')} first.
                </Text>
              )}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
