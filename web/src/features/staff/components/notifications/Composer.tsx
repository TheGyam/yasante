import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Megaphone, Send, ShieldAlert, X } from 'lucide-react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Input, Select, TextArea } from '@/shared/ui/Input';
import { Link } from '@/shared/ui/Link';
import { Tabs } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { formatNumber, plural } from '../../format';
import { staffMessage, useBroadcasts, useSearch, useStaffMutation } from '../../hooks';
import type { Audience, BroadcastKind, Reach } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';
import * as ui from '../ui.css';
import { PhonePreview } from './PhonePreview';
import * as s from './Composer.css';

const KINDS: { value: BroadcastKind; title: string; body: string; icon: typeof Megaphone }[] = [
  {
    value: 'update',
    title: 'Important update',
    body: 'Something people need to know: an outage, a change to how bookings work, a safety notice. Reaches everyone in the audience. Never use it to promote anything.',
    icon: ShieldAlert,
  },
  {
    value: 'news',
    title: 'News or offer',
    body: 'Anything promotional: new features, stylists near them, offers. Only reaches people who switched on “News and offers” in the app. At most one a day.',
    icon: Megaphone,
  },
];

const WHO = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'clients', label: 'Clients' },
  { value: 'stylists', label: 'Stylists' },
  { value: 'people', label: 'Chosen people' },
];

/**
 * Write a push notification, choose who gets it, see exactly how many it will reach,
 * try it on your own phone, then send, confirming the number first.
 */
export function Composer({ csrf }: { csrf: string }) {
  const navigate = useNavigate();
  const mutate = useStaffMutation();
  const history = useBroadcasts();
  const [kind, setKind] = useState<BroadcastKind>('update');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [audience, setAudience] = useState<Audience>({
    who: 'everyone',
    area: '',
    platform: 'any',
    joined: 'any',
    people: [],
  });
  const [chosen, setChosen] = useState<{ id: string; name: string }[]>([]);
  const [term, setTerm] = useState('');
  const [lastReach, setReach] = useState<Reach>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const found = useSearch(useDebouncedValue(term, 200));
  const people = found.data?.groups.find(group => group.name === 'People')?.items ?? [];

  const form = (extra: Record<string, string> = {}) => {
    const data = new FormData();
    data.set(
      'payload',
      JSON.stringify({
        kind,
        title,
        body,
        url,
        audience: { ...audience, people: chosen.map(person => person.id) },
      })
    );
    Object.entries(extra).forEach(([key, value]) => data.set(key, value));
    return data;
  };

  // The reach updates as the audience or the kind changes.
  const key = useDebouncedValue(
    JSON.stringify([kind, audience, chosen.map(person => person.id), url]),
    300
  );
  // A failed count clears the number: an old one would promise a reach that isn't known.
  const [recount, setRecount] = useState(0);
  // A recount after a refused send keeps the reason on screen next to the new number.
  const keepError = useRef(false);
  useEffect(() => {
    if (audience.who === 'people' && !chosen.length) return;
    let live = true;
    mutate<Reach>('broadcasts/audience/', form(), csrf)
      .then(result => {
        if (!live) return;
        setReach(result);
        if (!keepError.current) setError('');
        keepError.current = false;
      })
      .catch(failure => live && (setReach(undefined), setError(staffMessage(failure))));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, recount]);

  const reach = audience.who === 'people' && !chosen.length ? undefined : lastReach;
  const ready = title.trim() && body.trim() && reach && reach.reachable > 0;
  const blocked = kind === 'news' && history.data?.newsTooSoon;

  const sendTest = async () => {
    setBusy(true);
    try {
      await mutate('broadcasts/test/', form(), csrf);
      toast('Sent to your phone. Check it looks right.');
    } catch (failure) {
      toast(staffMessage(failure), { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!reach) return;
    setBusy(true);
    try {
      const result = await mutate<{ recipients: number }>(
        'broadcasts/send/',
        form({ expected: String(reach.reachable) }),
        csrf
      );
      toast(`Sending to ${plural(result.recipients, 'person', 'people')}`);
      navigate('/notifications');
    } catch (failure) {
      setConfirming(false);
      setError(staffMessage(failure));
      // "The audience changed": count again, so the button offers the number that will send.
      keepError.current = true;
      setRecount(n => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={ui.page}>
      <header className={ui.heading}>
        <Link to="/notifications" className={s.back}>
          <ArrowLeft size={14} aria-hidden /> Push notifications
        </Link>
        <Text variant="title1">New push notification</Text>
      </header>
      <div className={s.layout}>
        <div className={s.form}>
          <section className={ui.card} aria-labelledby="kind-title">
            <Text variant="title3" id="kind-title">
              1. What kind of message is it?
            </Text>
            <div className={s.kinds} role="radiogroup" aria-labelledby="kind-title">
              {KINDS.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={kind === option.value}
                    className={s.kind}
                    onClick={() => setKind(option.value)}
                  >
                    <Icon size={18} aria-hidden className={s.kindIcon} />
                    <span className={s.kindTitle}>{option.title}</span>
                    <span className={s.kindBody}>{option.body}</span>
                  </button>
                );
              })}
            </div>
            {blocked && (
              <InlineAlert message="A news message already went out today. People switch notifications off when they get too many, so this one can go tomorrow." />
            )}
          </section>

          <section className={ui.card} aria-labelledby="message-title">
            <Text variant="title3" id="message-title">
              2. The message
            </Text>
            <Input
              label="Title"
              value={title}
              maxLength={65}
              onChange={event => setTitle(event.target.value)}
              hint={`${title.length} of 65. Phones cut long titles, so keep it short.`}
            />
            <TextArea
              label="Message"
              value={body}
              maxLength={180}
              rows={3}
              onChange={event => setBody(event.target.value)}
              hint={`${body.length} of 180. The first line or two is what shows on a locked screen.`}
            />
            <Input
              label="Opens (optional)"
              value={url}
              maxLength={200}
              placeholder="/looks"
              onChange={event => setUrl(event.target.value.trim())}
              hint="A page in the app, like /looks or /stylists. Leave empty to just open the app."
            />
          </section>

          <section className={ui.card} aria-labelledby="audience-title">
            <Text variant="title3" id="audience-title">
              3. Who gets it
            </Text>
            <Tabs
              label="Audience"
              value={audience.who}
              onChange={who => setAudience({ ...audience, who: who as Audience['who'] })}
              items={WHO}
            />
            {audience.who === 'people' ? (
              <div className={ui.stack}>
                <Input
                  label="Find people"
                  type="search"
                  value={term}
                  onChange={event => setTerm(event.target.value)}
                  placeholder="Name or email"
                />
                {term.trim().length > 1 && (
                  <ul className={s.results}>
                    {people.map(person => {
                      const id = person.url.split('/').pop()!;
                      const picked = chosen.some(item => item.id === id);
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            className={s.result}
                            disabled={picked}
                            onClick={() => {
                              setChosen([...chosen, { id, name: person.name }]);
                              setTerm('');
                            }}
                          >
                            {person.name}
                            <span className={ui.muted}>{picked ? 'Added' : 'Add'}</span>
                          </button>
                        </li>
                      );
                    })}
                    {!found.isFetching && !people.length && (
                      <li className={ui.muted}>Nobody matches.</li>
                    )}
                  </ul>
                )}
                {chosen.length > 0 && (
                  <div className={s.chips}>
                    {chosen.map(person => (
                      <button
                        key={person.id}
                        type="button"
                        className={s.chip}
                        onClick={() => setChosen(chosen.filter(item => item.id !== person.id))}
                        aria-label={`Remove ${person.name}`}
                      >
                        {person.name} <X size={12} aria-hidden />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={s.filters}>
                <Input
                  label="Area (optional)"
                  value={audience.area}
                  maxLength={80}
                  placeholder="Peckham"
                  onChange={event => setAudience({ ...audience, area: event.target.value })}
                />
                <Select
                  label="Phone"
                  value={audience.platform}
                  onChange={event =>
                    setAudience({
                      ...audience,
                      platform: event.target.value as Audience['platform'],
                    })
                  }
                >
                  <option value="any">iPhone and Android</option>
                  <option value="ios">iPhone only</option>
                  <option value="android">Android only</option>
                </Select>
                <Select
                  label="Joined"
                  value={audience.joined}
                  onChange={event =>
                    setAudience({ ...audience, joined: event.target.value as Audience['joined'] })
                  }
                >
                  <option value="any">Any time</option>
                  <option value="7">In the last 7 days</option>
                  <option value="30">In the last 30 days</option>
                  <option value="90">In the last 90 days</option>
                </Select>
              </div>
            )}
          </section>
          {error && <InlineAlert message={error} />}
        </div>

        <aside className={s.side}>
          <PhonePreview title={title} body={body} />
          <section className={`${ui.card} ${s.reach}`} aria-live="polite">
            {reach ? (
              <>
                <span className={s.reachNumber}>{formatNumber(reach.reachable)}</span>
                <Text variant="callout">
                  {reach.reachable === 1 ? 'person will get it' : 'people will get it'}
                </Text>
                <Text variant="footnote" tone="secondary">
                  {reach.summary}: {plural(reach.matched, 'person', 'people')} in all.
                  {reach.noDevice > 0 &&
                    ` ${formatNumber(reach.noDevice)} have no phone signed in.`}
                  {kind === 'news' &&
                    reach.notOptedIn > 0 &&
                    ` ${formatNumber(reach.notOptedIn)} haven’t switched on news.`}
                </Text>
              </>
            ) : (
              <Text variant="footnote" tone="secondary">
                {audience.who === 'people'
                  ? 'Add people to see who it reaches.'
                  : 'Working out who it reaches…'}
              </Text>
            )}
          </section>
          <div className={s.buttons}>
            <Button
              label="Send a test to me"
              variant="secondary"
              size="md"
              disabled={!title.trim() || !body.trim() || busy}
              onClick={() => void sendTest()}
            />
            <Button
              label={reach ? `Send to ${plural(reach.reachable, 'person', 'people')}` : 'Send'}
              icon={Send}
              size="md"
              disabled={!ready || busy || !!blocked}
              onClick={() => setConfirming(true)}
            />
          </div>
        </aside>
      </div>
      <ConfirmDialog
        open={confirming}
        title={`Send to ${reach ? plural(reach.reachable, 'person', 'people') : ''}?`}
        onClose={() => setConfirming(false)}
      >
        <Text tone="secondary">
          “{title}” goes to {reach?.summary.toLowerCase()} straight away. Once sent, it can’t be
          taken back from their phones.
        </Text>
        <div className={ui.actions}>
          <Button label="Send now" icon={Send} loading={busy} onClick={() => void send()} />
          <Button label="Cancel" variant="secondary" onClick={() => setConfirming(false)} />
        </div>
      </ConfirmDialog>
    </div>
  );
}
