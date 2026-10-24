import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowDown, ArrowUp, ImagePlus, X } from 'lucide-react';
import { useMenu } from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { useFeature } from '@/shared/lib/features';
import { plural } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, Select } from '@/shared/ui/Input';
import { Page } from '@/shared/ui/Page';
import { Pill } from '@/shared/ui/Pill';
import { Tabs } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';
import {
  PhotoUploadError,
  usePostLookPhotos,
  usePostWork,
  useStyles,
  type WorkDraft,
} from '../hooks';
import * as styles from './PostWork.css';

/** As many as the server takes in one go (MAX_PORTFOLIO_BATCH). */
const MAX = 20;
/** The upload limit, so a too-big photo is caught before it's sent. */
const MAX_BYTES = 15 * 1024 * 1024;
/** A look holds at most this many photos. */
const LOOK_MAX = 5;

interface Chosen extends Omit<WorkDraft, 'file'> {
  key: string;
  file: File;
  preview: string;
}

type PostMode = 'separate' | 'together';

/**
 * Posting her work: each photo becomes a look in the feed, credited to her, and joins
 * her page. Many at once, so her back catalogue is up before clients arrive.
 */
export function PostWorkScreen({ accountId }: { accountId: string }) {
  const navigate = useNavigate();
  const { data: styleList = [] } = useStyles();
  const { data: menu = [] } = useMenu(accountId);
  const { post, progress, reset } = usePostWork();
  const {
    post: postTogether,
    progress: togetherProgress,
    reset: resetTogether,
  } = usePostLookPhotos();
  const multiPhotoLooks = useFeature('multi_photo_looks');
  const [picks, setPicks] = useState<Chosen[]>([]);
  const [onPage, setOnPage] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [tooMany, setTooMany] = useState(false);
  const [tooBig, setTooBig] = useState(0);
  const [mode, setMode] = useState<PostMode>('separate');
  const [together, setTogether] = useState<{
    style: string;
    serviceId?: string;
    caption: string;
  }>({ style: '', serviceId: undefined, caption: '' });
  const [togetherError, setTogetherError] = useState<string>();
  const canChooseTogether = multiPhotoLooks && picks.length > 1;
  // The choice only makes sense with the switch on and several photos; otherwise fall
  // back to today's behaviour rather than leaving her stuck in a mode she can't see.
  const activeMode: PostMode = canChooseTogether ? mode : 'separate';
  const overLookLimit = activeMode === 'together' && picks.length > LOOK_MAX;
  const posting =
    activeMode === 'together'
      ? !!togetherProgress && togetherProgress.done < togetherProgress.total
      : !!progress && progress.done < progress.total;

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
    resetTogether();
    setTogetherError(undefined);
  };

  const change = (key: string, changes: Partial<Chosen>) =>
    setPicks(all => all.map(p => (p.key === key ? { ...p, ...changes } : p)));
  const everyone = (changes: Partial<Chosen>) =>
    setPicks(all => all.map(p => ({ ...p, ...changes })));
  const untagged = picks.filter(p => !p.style).length;

  const chooseMode = (next: PostMode) => {
    if (next === 'together' && activeMode !== 'together') {
      const first = picks[0];
      setTogether({
        style: first?.style ?? '',
        serviceId: first?.serviceId,
        caption: first?.caption ?? '',
      });
    }
    setTogetherError(undefined);
    setMode(next);
  };

  const swap = (i: number, j: number) =>
    setPicks(all => {
      const copy = [...all];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const moveEarlier = (index: number) => swap(index, index - 1);
  const moveLater = (index: number) => swap(index, index + 1);

  const submit = async () => {
    if (activeMode === 'together') {
      setTogetherError(undefined);
      const error = await postTogether(
        {
          files: picks.map(p => p.file),
          style: together.style,
          serviceId: together.serviceId,
          caption: together.caption,
        },
        onPage
      );
      if (!error) {
        navigate('/portfolio', { state: { posted: 1, photos: picks.length } });
        return;
      }
      setTogetherError(
        error instanceof PhotoUploadError
          ? error.message
          : errorMessage(error, 'That look didn’t post. Try again.')
      );
      return;
    }
    const failed = await post(picks, onPage);
    if (!failed.length) {
      navigate('/portfolio', { state: { posted: picks.length, photos: picks.length } });
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

        {canChooseTogether && !posting && (
          <Tabs
            label="How to post these photos"
            value={activeMode}
            onChange={value => chooseMode(value as PostMode)}
            items={[
              { value: 'separate', label: 'Each photo as its own look' },
              { value: 'together', label: 'One look with these photos' },
            ]}
          />
        )}
        {overLookLimit && (
          <InlineAlert
            tone="info"
            message="A look holds up to 5 photos. Remove some to post them together."
          />
        )}

        {activeMode === 'separate' && picks.length > 1 && !posting && (
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

        {activeMode === 'together' && picks.length > 0 && !posting && (
          <Glass padded radius="xl" className={styles.fields}>
            <Text variant="overline" tone="tertiary" as="h2">
              For this look
            </Text>
            <div className={styles.row}>
              <Select
                label="Style"
                value={together.style}
                error={!together.style ? 'Pick the style' : undefined}
                onChange={e => setTogether(t => ({ ...t, style: e.target.value }))}
              >
                <option value="">Choose…</option>
                {styleOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              {menu.length > 0 && (
                <Select
                  label="Service"
                  value={together.serviceId ?? ''}
                  hint={
                    menu.length
                      ? 'Shows its name and price with the look'
                      : 'Add services in Menu to link one'
                  }
                  onChange={e =>
                    setTogether(t => ({ ...t, serviceId: e.target.value || undefined }))
                  }
                >
                  <option value="">None</option>
                  {menu.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <Input
              label="Caption (optional)"
              value={together.caption}
              maxLength={1000}
              placeholder="Mid-back knotless, 6 hours, hair included"
              onChange={e => setTogether(t => ({ ...t, caption: e.target.value }))}
            />
          </Glass>
        )}

        {picks.length > 0 && (
          <div className={styles.photos}>
            {picks.map((pick, index) =>
              activeMode === 'together' ? (
                <Glass key={pick.key} padded radius="xl" className={styles.photo}>
                  <img src={pick.preview} alt={`Photo ${index + 1}`} className={styles.preview} />
                  <div className={styles.fields}>
                    {index === 0 ? (
                      <Pill tone="accent">Cover</Pill>
                    ) : (
                      <div className={styles.actions}>
                        <Button
                          label=""
                          aria-label="Move earlier"
                          icon={ArrowUp}
                          variant="ghost"
                          size="sm"
                          disabled={posting}
                          onClick={() => moveEarlier(index)}
                        />
                        <Button
                          label=""
                          aria-label="Move later"
                          icon={ArrowDown}
                          variant="ghost"
                          size="sm"
                          disabled={posting || index === picks.length - 1}
                          onClick={() => moveLater(index)}
                        />
                      </div>
                    )}
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
              ) : (
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
              )
            )}
          </div>
        )}

        {activeMode === 'separate' && progress && (
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

        {activeMode === 'together' && togetherProgress && (
          <div className={styles.fields} aria-live="polite">
            <div className={styles.bar}>
              <div
                className={styles.barFill}
                style={{ transform: `scaleX(${togetherProgress.done / togetherProgress.total})` }}
              />
            </div>
            <Text variant="footnote" tone="secondary">
              {posting
                ? `Uploading ${togetherProgress.done} of ${togetherProgress.total}…`
                : 'Posting…'}
            </Text>
          </div>
        )}
        {activeMode === 'together' && togetherError && <InlineAlert message={togetherError} />}

        {picks.length > 0 && (
          <div className={styles.fields}>
            <Checkbox checked={onPage} onChange={setOnPage}>
              <Text variant="callout" as="span">
                {activeMode === 'together'
                  ? 'Also show its cover photo on my page'
                  : `Also show ${picks.length === 1 ? 'it' : 'them'} on my page`}
              </Text>
            </Checkbox>
            <div className={styles.actions}>
              <Button
                label={
                  activeMode === 'together'
                    ? `Post 1 look with ${plural(picks.length, 'photo')}`
                    : `Post ${plural(picks.length, 'photo')}`
                }
                disabled={
                  activeMode === 'together'
                    ? !together.style || overLookLimit || posting
                    : !!untagged || posting
                }
                loading={posting}
                onClick={submit}
              />
              {activeMode === 'separate' && untagged > 0 && (
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
