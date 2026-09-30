import { useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Kbd } from '@/shared/ui/Kbd';
import { Link } from '@/shared/ui/Link';
import { Text } from '@/shared/ui/Text';
import { formatAgo, formatDateTime } from '../../format';
import { useShortcuts } from '../../hooks';
import type { ReviewItem, ReviewQueue } from '../../types';
import { ConfirmDialog } from '../ConfirmDialog';
import * as ui from '../ui.css';
import * as s from './ReviewDetail.css';

// The decision that clears an item without acting against anyone goes last and quiet.
const GENTLE = ['dismiss', 'clear_flag', 'uphold'];

export function ReviewDetail({
  item,
  actions,
  position,
  busy,
  onDecide,
  onPrevious,
  onNext,
}: {
  item: ReviewItem;
  actions: ReviewQueue['actions'];
  position: string;
  busy: boolean;
  onDecide: (action: string, note: string, confirmed?: boolean) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState<ReviewQueue['actions'][number]>();
  const choose = (action: ReviewQueue['actions'][number]) =>
    action.reversible ? onDecide(action.key, note) : setConfirming(action);

  useShortcuts(
    Object.fromEntries(actions.map(action => [action.shortcut, () => !busy && choose(action)])),
    !confirming
  );

  const content = item.content;
  const images = [...item.images, content?.image].filter((image): image is string => !!image);
  return (
    <article className={`${ui.card} ${s.detail}`} aria-labelledby="review-title">
      <header className={s.head}>
        <div className={ui.stack}>
          <Text variant="footnote" tone="tertiary">
            {position} · <time title={formatDateTime(item.at)}>{formatAgo(item.at)}</time>
          </Text>
          <Text variant="title2" id="review-title">
            {item.title}
          </Text>
        </div>
        <div className={ui.actions}>
          <Button
            label=""
            aria-label="Previous item"
            icon={ChevronLeft}
            variant="quiet"
            size="sm"
            disabled={!onPrevious}
            onClick={onPrevious}
          />
          <Button
            label=""
            aria-label="Next item"
            icon={ChevronRight}
            variant="quiet"
            size="sm"
            disabled={!onNext}
            onClick={onNext}
          />
          <Button label="Open record" to={item.url} variant="secondary" size="sm" />
        </div>
      </header>
      {item.facts.filter(Boolean).length > 0 && (
        <ul className={s.facts}>
          {item.facts.filter(Boolean).map(fact => (
            <li key={fact} className={s.fact}>
              {fact}
            </li>
          ))}
        </ul>
      )}
      {item.text && <blockquote className={s.quote}>{item.text}</blockquote>}
      {content && (
        <section className={s.content} aria-label="The reported content">
          {content.author && (
            <Text variant="caption" tone="tertiary">
              {content.author}
            </Text>
          )}
          <Text variant="bodyStrong">{content.title}</Text>
          {content.text && <Text tone="secondary">{content.text}</Text>}
          {content.url && (
            <Link to={content.url} className={ui.link}>
              See it in full
            </Link>
          )}
        </section>
      )}
      {images.length > 0 && (
        <div className={s.images} data-pair={images.length === 2}>
          {images.map((src, index) => (
            <figure key={src + index} className={s.figure}>
              <img src={src} alt="" className={s.image} loading="lazy" />
              {images.length === 2 && (
                <figcaption className={s.caption}>
                  {index ? 'Possible original' : 'This photo'}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
      {item.evidence && (
        <a href={item.evidence} target="_blank" rel="noopener noreferrer" className={ui.link}>
          Open the evidence <ExternalLink size={12} aria-hidden />
        </a>
      )}
      <div className={s.decide}>
        <label className={s.noteLabel}>
          <span>Note for the log (optional)</span>
          <textarea
            className={s.note}
            rows={2}
            value={note}
            maxLength={2000}
            onChange={event => setNote(event.target.value)}
            placeholder="Why you decided this, for whoever looks next"
          />
        </label>
        <div className={s.buttons}>
          {[...actions]
            .sort((a, b) => Number(GENTLE.includes(a.key)) - Number(GENTLE.includes(b.key)))
            .map((action, index) => (
              <Button
                key={action.key}
                label={action.label}
                variant={
                  index === 0 ? 'primary' : GENTLE.includes(action.key) ? 'quiet' : 'secondary'
                }
                size="md"
                disabled={busy}
                onClick={() => choose(action)}
                trailing={<Kbd>{action.shortcut}</Kbd>}
              />
            ))}
        </div>
        <Text variant="caption" tone="tertiary">
          <Kbd>j</Kbd> <Kbd>k</Kbd> move between items
        </Text>
      </div>
      <ConfirmDialog
        open={!!confirming}
        title={`${confirming?.label ?? ''}?`}
        onClose={() => setConfirming(undefined)}
      >
        <Text tone="secondary">
          This acts on the content itself and can’t be undone from here. You can still reverse it
          from the record later.
        </Text>
        <div className={ui.actions}>
          <Button
            label={confirming?.label ?? 'Confirm'}
            onClick={() => {
              if (confirming) onDecide(confirming.key, note, true);
              setConfirming(undefined);
            }}
          />
          <Button label="Cancel" variant="secondary" onClick={() => setConfirming(undefined)} />
        </div>
      </ConfirmDialog>
    </article>
  );
}
