import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check, ExternalLink, ImagePlus, Trash2 } from 'lucide-react';
import { HAIR_TEXTURES } from '@/features/looks';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { formatDate, formatDateTime } from '../../format';
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
import { Avatar, featuredStatus, Progress } from './Featured';
import { LookForm } from './LookForm';
import { PagePreview } from './PagePreview';
import * as s from './Featured.css';

function Section({
  step,
  title,
  done,
  aside,
  children,
}: {
  step: number;
  title: string;
  done: boolean;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={s.section} aria-label={title}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>
          <span className={`${s.tick} ${done ? '' : s.stepNumber}`} aria-hidden>
            {done ? <Check size={13} strokeWidth={3} /> : step}
          </span>
          {title}
          {done && <span className="visually-hidden"> (done)</span>}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const LINK_GREETING = 'Your page on Yasante is ready 💕';
const linkClosing = (expires: string) =>
  'Open it to see how it looks, and make it yours whenever you like. ' +
  `The link works once and runs out on ${formatDate(expires)}.`;

/** The text staff paste into the chat with them, with their link in it. */
export function linkMessage(url: string, expires: string) {
  return `${LINK_GREETING}
${url}

${linkClosing(expires)}`;
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
  const [copied, setCopied] = useState<'message' | 'link'>();
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const yesInput = useRef<HTMLInputElement>(null);
  const looksSection = useRef<HTMLDivElement>(null);
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
        setCopied(undefined);
      }
      if (action === 'take-down') navigate('/featured');
      if (method === 'DELETE') setRemoving(undefined);
    } catch (failure) {
      setError(staffMessage(failure));
    }
  };
  const copy = (what: 'message' | 'link') => {
    if (!link) return;
    const text = what === 'link' ? link.url : linkMessage(link.url, link.expires_at);
    void navigator.clipboard
      .writeText(text)
      .then(() => setCopied(what))
      .catch(() => setError('That couldn’t be copied. Select it and copy it instead.'));
  };
  const yes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    if (!(body.get('proof') instanceof File) || !(body.get('proof') as File).size)
      body.delete('proof');
    void request('yes', body);
  };
  const openComposer = () => {
    setAdding(true);
    looksSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const styleName = (slug: string) =>
    styleNames.data?.[slug] ?? (styleNames.isPending ? '…' : 'Unknown style');

  // Always one thing to do next, at the top, so nobody has to work out the order.
  const next: { title: string; body: string; action?: ReactNode } = claimed
    ? {
        title: 'It’s their page now',
        body: `Claimed by them on ${formatDateTime(page.claimed_at!)}. It's their page now.`,
      }
    : !page.look_count
      ? {
          title: 'Add their first look',
          body: 'Save a few of their best posts and add them here.',
          action: <Button label="Add their first look" icon={ImagePlus} onClick={openComposer} />,
        }
      : !page.agreed
        ? {
            title: 'Record their yes',
            body: 'Write down where and when they said yes before the page goes live.',
            action: (
              <Button
                label="Record their yes"
                onClick={() => {
                  yesInput.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  yesInput.current?.focus({ preventScroll: true });
                }}
              />
            ),
          }
        : !page.live
          ? {
              title: 'Put it live',
              body: 'Clients can find their work and join the waitlist once it’s live.',
              action: (
                <Button label="Put it live" loading={busy} onClick={() => void request('live')} />
              ),
            }
          : !linkLive && !link
            ? {
                title: 'Send them their link',
                body: 'Make their private link and send it in your chat with them.',
                action: (
                  <Button
                    label="Make their link"
                    loading={busy}
                    onClick={() => void request('link')}
                  />
                ),
              }
            : {
                title: 'Waiting for them to make it theirs',
                body: page.waiting
                  ? `${page.waiting} ${page.waiting === 1 ? 'person is' : 'people are'} on the waitlist. Tell them when you message.`
                  : 'Nothing to do until they open their link.',
              };

  return (
    <div className={ui.page}>
      <Link className={s.back} to="/featured">
        <ArrowLeft size={14} aria-hidden /> Featured stylists
      </Link>
      <div className={s.layout}>
        <div className={s.main}>
          <header className={s.profile}>
            <Avatar page={page} large />
            <div className={`${ui.stack} ${ui.grow}`}>
              <h1 className={s.title}>{page.display_name}</h1>
              <div className={s.sub}>
                {page.instagram_handle && (
                  <a
                    className={s.handleLink}
                    href={`https://www.instagram.com/${encodeURIComponent(page.instagram_handle)}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Their Instagram"
                  >
                    Instagram @{page.instagram_handle} <ExternalLink size={12} aria-hidden />
                  </a>
                )}
                {page.instagram_handle && page.tiktok_handle && ' · '}
                {page.tiktok_handle && (
                  <a
                    className={s.handleLink}
                    href={`https://www.tiktok.com/@${encodeURIComponent(page.tiktok_handle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Their TikTok"
                  >
                    TikTok @{page.tiktok_handle} <ExternalLink size={12} aria-hidden />
                  </a>
                )}{' '}
                · {page.base_area} · {featuredStatus(page)}
              </div>
              <Progress page={page} />
            </div>
          </header>

          <div className={`${s.nextCard} ${claimed ? s.nextDone : ''}`} role="status">
            <div className={ui.stack}>
              <span className={s.nextLabel}>{claimed ? 'Done' : 'Next'}</span>
              <span className={s.nextTitle}>{next.title}</span>
              <Text tone="secondary">{next.body}</Text>
            </div>
            {next.action}
          </div>

          {error && <InlineAlert message={error} />}

          <div ref={looksSection}>
            <Section
              step={1}
              title="Their looks"
              done={page.look_count > 0}
              aside={
                <span className={ui.muted}>
                  {page.look_count} {page.look_count === 1 ? 'look' : 'looks'} · {photoCount}{' '}
                  {photoCount === 1 ? 'photo' : 'photos'}
                </span>
              }
            >
              {styleNames.isError && <InlineAlert message={staffMessage(styleNames.error)} />}
              {adding && !claimed && (
                <LookForm id={page.id} csrf={csrf} onClose={() => setAdding(false)} />
              )}
              <div className={s.looks}>
                {!claimed && !adding && (
                  <button type="button" className={s.addTile} onClick={() => setAdding(true)}>
                    <ImagePlus size={22} aria-hidden />
                    Add a look
                  </button>
                )}
                {page.looks.map((look, index) => (
                  <article key={look.id} className={s.look}>
                    <div className={s.cover}>
                      <img
                        className={s.coverImage}
                        src={look.photos[0]?.thumb_uri || look.photos[0]?.uri}
                        alt={`${page.display_name}, look ${index + 1}`}
                      />
                      {look.photos.length > 1 && (
                        <span className={s.photoCount}>{look.photos.length} photos</span>
                      )}
                      {!claimed && (
                        <button
                          type="button"
                          className={`${s.iconButton} ${s.coverAction}`}
                          aria-label={`Remove look ${index + 1}`}
                          title="Remove this look"
                          disabled={busy}
                          onClick={() => setRemoving(look)}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      )}
                    </div>
                    <div className={s.tags}>
                      {look.styles.map(slug => (
                        <span key={slug} className={s.tag}>
                          {styleName(slug)}
                        </span>
                      ))}
                      {look.hair_texture && (
                        <span className={s.tag}>
                          {HAIR_TEXTURES.find(hair => hair.id === look.hair_texture)?.name ??
                            look.hair_texture}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          </div>

          <Section step={2} title="Their yes" done={page.agreed}>
            {page.agreed && page.agreed_at ? (
              <div className={s.done}>
                <Check size={18} aria-hidden />
                <span>
                  Said yes on {formatDateTime(page.agreed_at)}: {page.agreed_note}
                </span>
              </div>
            ) : (
              !claimed && (
                <form onSubmit={yes}>
                  <fieldset className={s.fields} disabled={busy}>
                    <Input
                      ref={yesInput}
                      label="Where and when did they say yes?"
                      name="note"
                      required
                      maxLength={300}
                      placeholder="Said yes in our TikTok chat, to Akua"
                      hint="Include who the yes was sent to."
                    />
                    <FileField
                      field={{
                        name: 'proof',
                        label: 'A screenshot of it (optional)',
                        kind: 'file',
                        value: '',
                        errors: [],
                      }}
                      common={{ name: 'proof', label: 'A screenshot of it (optional)' }}
                    />
                    <div className={s.composerFooter}>
                      <Button label="They said yes" type="submit" loading={busy} />
                    </div>
                  </fieldset>
                </form>
              )
            )}
          </Section>

          <Section step={3} title="Put the page live" done={page.live}>
            {page.live ? (
              <div className={s.done}>
                <Check size={18} aria-hidden />
                <span>
                  Live at yasante.com/{page.handle} · {page.waiting} on the waitlist ·{' '}
                  <a
                    className={ui.link}
                    href={`https://yasante.com/${encodeURIComponent(page.handle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View the page
                  </a>
                </span>
              </div>
            ) : (
              !claimed && (
                <div className={s.next}>
                  <Text tone="secondary">
                    {reason || 'Clients can find their work and join the waitlist.'}
                  </Text>
                  <Button
                    label="Put the page live"
                    disabled={!!reason}
                    loading={busy}
                    onClick={() => void request('live')}
                  />
                </div>
              )
            )}
          </Section>

          <Section step={4} title="Their link" done={claimed || linkLive || !!link}>
            {claimed ? (
              <Text>The link has been used.</Text>
            ) : link ? (
              <div className={s.linkBox}>
                <span className={s.label}>Paste this into your chat with them</span>
                <p className={s.message}>
                  {LINK_GREETING}
                  <br />
                  <span className={s.linkText}>{link.url}</span>
                  <br />
                  <br />
                  {linkClosing(link.expires_at)}
                </p>
                <div className={s.composerFooter}>
                  <Button
                    label="Copy their link"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => copy('link')}
                  />
                  <Button
                    label="Copy the message"
                    size="sm"
                    disabled={busy}
                    onClick={() => copy('message')}
                  />
                </div>
                {copied && (
                  <Text role="status" tone="secondary">
                    {copied === 'link' ? 'Link copied.' : 'Message copied. Paste it into the chat.'}
                  </Text>
                )}
                <Text variant="footnote" tone="secondary">
                  Making a new link stops this one working. It’s only shown now, so copy it before
                  you leave.
                </Text>
              </div>
            ) : (
              <Text tone="secondary">
                {page.link_expires_at
                  ? `${linkLive ? 'Link live' : 'Link has run out'} · ${formatDateTime(page.link_expires_at)}`
                  : 'Their private link opens the page and lets them make it theirs. It only ever goes to them, in your chat.'}
              </Text>
            )}
            {!claimed && (
              <div className={s.composerFooter}>
                <Button
                  label="Make a new link"
                  variant="secondary"
                  loading={busy}
                  onClick={() => void request('link')}
                />
              </div>
            )}
          </Section>

          <details className={s.section}>
            <summary className={s.summary}>
              Their details <span className={ui.muted}>Name, area, bio and photo</span>
            </summary>
            <Details csrf={csrf} page={page} />
          </details>

          {!claimed && (
            <div className={s.dangerZone}>
              <span>If they change their mind, everything we made for them goes at once.</span>
              <Button
                label="Take the page down"
                size="sm"
                variant="quiet"
                className={s.danger}
                disabled={busy}
                onClick={() => {
                  setTakingDown(true);
                  setHandle('');
                }}
              />
            </div>
          )}
        </div>

        <aside className={s.side}>
          <PagePreview page={page} />
          <span className={s.caption}>
            {page.live ? 'What clients see now' : 'What clients will see once it’s live'}
          </span>
        </aside>
      </div>

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
