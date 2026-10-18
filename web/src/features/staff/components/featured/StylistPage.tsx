import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { HAIR_TEXTURES } from '@/features/looks';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { formatDateTime } from '../../format';
import {
  staffMessage,
  useFeaturedDetail,
  useFeaturedStyleNames,
  useFeaturedWrite,
} from '../../hooks';
import type { FeaturedDetail, FeaturedLook } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';
import { FileField } from '../fields/FileField';
import * as controls from '../controls.css';
import * as ui from '../ui.css';
import { Details } from './Details';
import { LookForm } from './LookForm';
import * as s from './Featured.css';

function Step({ title, done }: { title: string; done: boolean }) {
  return (
    <div className={ui.row}>
      <Text variant="title3">{title}</Text>
      {done && <Check size={18} aria-label="Done" />}
    </div>
  );
}

export function StylistPage({ id, csrf }: { id: string; csrf: string }) {
  const query = useFeaturedDetail(id);
  if (query.isError) return <InlineAlert message={staffMessage(query.error)} />;
  if (!query.data) return <Skeleton className={controls.loadingPanel} />;
  return <PageContent page={query.data} csrf={csrf} />;
}

function PageContent({ page, csrf }: { page: FeaturedDetail; csrf: string }) {
  const styleNames = useFeaturedStyleNames(page.looks.flatMap(look => look.styles));
  const navigate = useNavigate();
  const write = useFeaturedWrite(csrf);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<FeaturedLook>();
  const [takingDown, setTakingDown] = useState(false);
  const [handle, setHandle] = useState('');
  // The private link lives only on this mounted page, never in a query or browser storage.
  const [link, setLink] = useState<{ url: string; expires_at: string }>();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const remaining = page.link_expires_at ? Date.parse(page.link_expires_at) - Date.now() : 0;
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [page.link_expires_at, now]);
  const linkLive = !!page.link_expires_at && Date.parse(page.link_expires_at) > now;
  const claimed = !!page.claimed_at;
  const busy = write.isPending;
  const request = async (
    action: string,
    body = new FormData(),
    method: 'POST' | 'DELETE' = 'POST'
  ) => {
    if (busy) return;
    setError('');
    try {
      const result = await write.mutateAsync({
        path: `featured/${page.id}/${action}/`,
        body,
        method,
      });
      if ('url' in result) {
        setLink(result);
        setCopied(false);
      }
      if (action === 'take-down') navigate('/featured');
      if (method === 'DELETE') setRemoving(undefined);
    } catch (failure) {
      setError(staffMessage(failure));
    }
  };
  const yes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    if (!(body.get('proof') instanceof File) || !(body.get('proof') as File).size)
      body.delete('proof');
    void request('yes', body);
  };
  const photoCount = page.looks.reduce((sum, look) => sum + look.photos.length, 0);
  const reason =
    !page.look_count && !page.agreed
      ? 'Add a look and record the yes before putting the page live.'
      : !page.look_count
        ? 'Add a look before putting the page live.'
        : !page.agreed
          ? 'Record the yes before putting the page live.'
          : '';
  return (
    <div className={ui.page}>
      <header className={ui.heading}>
        <Link to="/featured">Featured stylists</Link>
        <Text variant="title1">{page.display_name}</Text>
        <Text tone="secondary">
          @{page.handle} · {page.base_area}
        </Text>
      </header>
      {error && <InlineAlert message={error} />}
      <section className={ui.card}>
        <Step
          title="Their details"
          done={!!page.display_name && !!page.handle && !!page.base_area}
        />
        <Details csrf={csrf} page={page} />
      </section>
      <section className={ui.card}>
        <Step title="Their looks" done={page.look_count > 0} />
        {styleNames.isError && <InlineAlert message={staffMessage(styleNames.error)} />}
        <div className={s.grid}>
          {page.looks.map((look, index) => (
            <article key={look.id} className={ui.card}>
              <div className={s.photos}>
                {look.photos.map((photo, i) => (
                  <RemoteImage
                    key={photo.uri}
                    src={photo.thumb_uri || photo.uri}
                    alt={`${page.display_name}, look ${index + 1}, photo ${i + 1}`}
                    aspect={1}
                    className={s.photo}
                  />
                ))}
              </div>
              <Text>
                {look.styles
                  .map(
                    slug =>
                      styleNames.data?.[slug] ??
                      (styleNames.isPending ? 'Loading style name…' : 'Style name unavailable')
                  )
                  .join(', ')}
              </Text>
              <Text tone="secondary">
                {HAIR_TEXTURES.find(hair => hair.id === look.hair_texture)?.name ??
                  (look.hair_texture ? 'Hair type name unavailable' : 'Hair type not set')}
              </Text>
              {look.caption && <Text>{look.caption}</Text>}
              {!claimed && (
                <Button
                  label={`Remove look ${index + 1}`}
                  size="sm"
                  variant="quiet"
                  disabled={busy}
                  onClick={() => setRemoving(look)}
                />
              )}
            </article>
          ))}
        </div>
        {!page.looks.length && <Text>Add a look to show {page.display_name}'s work.</Text>}
        {!claimed && (
          <Button
            label={adding ? 'Cancel' : 'Add a look'}
            disabled={busy}
            onClick={() => setAdding(!adding)}
          />
        )}
        {adding && !claimed && <LookForm id={page.id} csrf={csrf} />}
      </section>
      <section className={ui.card}>
        <Step title="Their yes" done={page.agreed} />
        {page.agreed && page.agreed_at ? (
          <Text>
            Said yes on {formatDateTime(page.agreed_at)}: {page.agreed_note}
          </Text>
        ) : (
          !claimed && (
            <form onSubmit={yes}>
              <fieldset className={s.fields} disabled={busy}>
                <Input
                  label="Where and when did they say yes?"
                  name="note"
                  required
                  maxLength={300}
                  hint="Include who the yes was sent to."
                />
                <FileField
                  field={{
                    name: 'proof',
                    label: 'Screenshot (optional)',
                    kind: 'file',
                    value: '',
                    errors: [],
                  }}
                  common={{ name: 'proof', label: 'Screenshot (optional)' }}
                />
                <Button label="They said yes" type="submit" loading={busy} />
              </fieldset>
            </form>
          )
        )}
      </section>
      <section className={ui.card}>
        <Step title="Their link" done={linkLive && !claimed} />
        {link && !claimed && (
          <div className={ui.stack}>
            <Text className={s.link}>{link.url}</Text>
            <Text>
              This link works once and runs out on {formatDateTime(link.expires_at)}. Making a new
              one stops this one working.
            </Text>
            <Button
              label="Copy their link"
              disabled={busy}
              onClick={() => {
                void navigator.clipboard
                  .writeText(link.url)
                  .then(() => setCopied(true))
                  .catch(() =>
                    setError('The link could not be copied. Select it and copy it instead.')
                  );
              }}
            />
            {copied && <Text role="status">Link copied.</Text>}
          </div>
        )}
        {!claimed && (
          <>
            {!link && (
              <Text>
                {page.link_expires_at
                  ? `${linkLive ? 'Link live' : 'Link has run out'} · ${formatDateTime(page.link_expires_at)}`
                  : 'No live link. Make a new link to share with the saved Instagram account.'}
              </Text>
            )}
            <Button label="Make a new link" loading={busy} onClick={() => void request('link')} />
          </>
        )}
        {claimed && <Text>The link has been used.</Text>}
      </section>
      <section className={ui.card}>
        <Step title="Put the page live" done={page.live} />
        {page.live ? (
          <>
            <a
              className={ui.link}
              href={`https://yasante.com/${encodeURIComponent(page.handle)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View the page
            </a>
            <Text>{page.waiting} on the waitlist</Text>
          </>
        ) : (
          !claimed && (
            <>
              {reason && <Text>{reason}</Text>}
              <Button
                label="Put the page live"
                disabled={!!reason}
                loading={busy}
                onClick={() => void request('live')}
              />
            </>
          )
        )}
      </section>
      {claimed ? (
        <Text>Claimed by them on {formatDateTime(page.claimed_at!)}. It's their page now.</Text>
      ) : (
        <section className={`${ui.card} ${s.danger}`}>
          <Button
            label="Take the page down"
            className={s.danger}
            disabled={busy}
            onClick={() => {
              setTakingDown(true);
              setHandle('');
            }}
          />
        </section>
      )}
      <ConfirmDialog
        open={!!removing}
        title="Remove this look?"
        onClose={() => !busy && setRemoving(undefined)}
      >
        <Text>This look and its photos are deleted for good.</Text>
        <div className={ui.actions}>
          <Button
            label="Remove look"
            loading={busy}
            onClick={() =>
              removing && void request(`looks/${removing.id}`, new FormData(), 'DELETE')
            }
          />
          <Button
            label="Cancel"
            variant="secondary"
            disabled={busy}
            onClick={() => setRemoving(undefined)}
          />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={takingDown}
        title="Take the page down"
        onClose={() => !busy && setTakingDown(false)}
      >
        <Text>
          Their page, {page.look_count} {page.look_count === 1 ? 'look' : 'looks'} and {photoCount}{' '}
          {photoCount === 1 ? 'photo' : 'photos'} are deleted for good. The waitlist is emptied.
        </Text>
        <Text>The page photo and any saved screenshot are deleted too.</Text>
        <Input
          label={`Type ${page.handle} to confirm`}
          value={handle}
          disabled={busy}
          onChange={event => setHandle(event.target.value)}
        />
        <div className={ui.actions}>
          <Button
            label="Take the page down"
            className={s.danger}
            disabled={handle !== page.handle}
            loading={busy}
            onClick={() => {
              const body = new FormData();
              body.set('handle', handle);
              void request('take-down', body);
            }}
          />
          <Button
            label="Cancel"
            variant="secondary"
            disabled={busy}
            onClick={() => setTakingDown(false)}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
