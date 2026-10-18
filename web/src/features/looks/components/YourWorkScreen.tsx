import { useLocation } from 'react-router';
import { ImagePlus, Trash2 } from 'lucide-react';
import { usePortfolio, useRemovePortfolioPhoto } from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { plural } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Link } from '@/shared/ui/Link';
import { Page } from '@/shared/ui/Page';
import { PhotoCount } from '@/shared/ui/PhotoCount';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useDeleteLook, useMyLooks } from '../hooks';
import { lookAlt } from '../format';
import * as styles from './YourWork.css';

/** What she's posted: her looks in the feed, and the photos on her page. */
export function YourWorkScreen({ accountId }: { accountId: string }) {
  const posted = (useLocation().state as { posted?: number } | null)?.posted;
  const looks = useMyLooks();
  const portfolio = usePortfolio(accountId);
  const deleteLook = useDeleteLook();
  const removePhoto = useRemovePortfolioPhoto(accountId);

  const live = (looks.data ?? []).filter(l => l.visibility === 'public');
  const photos = portfolio.data ?? [];

  return (
    <Page title="Your work">
      <div className={styles.head}>
        <div>
          <Text variant="title1">Your work</Text>
          <Text variant="subhead" tone="secondary">
            Your looks are in the Yasante feed, where clients find you by style.
          </Text>
        </div>
        <Button label="Post your work" icon={ImagePlus} size="md" to="/looks/new" />
      </div>
      {posted && (
        <InlineAlert
          tone="success"
          message={`Posted ${plural(posted, 'photo')}. They’re in the feed now.`}
        />
      )}
      {(deleteLook.isError || removePhoto.isError) && (
        <InlineAlert
          message={errorMessage(deleteLook.error ?? removePhoto.error, 'Couldn’t remove that.')}
        />
      )}

      <SectionHeader title={`In the feed${live.length ? ` · ${live.length}` : ''}`} />
      {looks.isPending ? (
        <Skeleton style={{ height: 200, borderRadius: 20 }} />
      ) : looks.isError ? (
        <InlineAlert message={errorMessage(looks.error, 'Couldn’t load your looks.')} />
      ) : !live.length ? (
        <EmptyState
          icon={ImagePlus}
          title="Nothing posted yet"
          body="Post photos of your work: each one is a look clients can find by style, with your name on it."
          action={<Button label="Post your work" to="/looks/new" />}
        />
      ) : (
        <ul className={styles.grid}>
          {live.map(look => (
            <li key={look.id} className={styles.tile}>
              <Link to={`/looks/${look.id}`}>
                <RemoteImage
                  src={look.thumbUri ?? look.photoUri}
                  alt={lookAlt(look)}
                  aspect={4 / 5}
                />
                {look.photos.length > 1 && (
                  <PhotoCount count={look.photos.length} className={styles.count} />
                )}
              </Link>
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${lookAlt(look)}`}
                onClick={() => {
                  if (window.confirm('Remove this look from the feed? It goes for good.')) {
                    deleteLook.mutate(look.id);
                    // Its photo on her page goes with it: that photo linked here.
                    photos.filter(p => p.lookId === look.id).forEach(p => removePhoto.mutate(p.id));
                  }
                }}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <SectionHeader title={`On your page${photos.length ? ` · ${photos.length}` : ''}`} />
      {portfolio.isPending ? (
        <Skeleton style={{ height: 120, borderRadius: 20 }} />
      ) : !photos.length ? (
        <Text variant="subhead" tone="secondary">
          Photos you post with “Also show on my page” appear under “Their work” on your page.
        </Text>
      ) : (
        <ul className={styles.grid}>
          {photos.map((photo, index) => (
            <li key={photo.id} className={styles.tile}>
              <RemoteImage
                src={photo.thumbUri ?? photo.uri}
                alt={`Your work, photo ${index + 1}`}
                aspect={1}
              />
              {!!photo.lookPhotos && (
                <PhotoCount count={photo.lookPhotos.length} className={styles.count} />
              )}
              <button
                type="button"
                className={styles.remove}
                aria-label={`Take photo ${index + 1} off your page`}
                onClick={() => {
                  if (window.confirm('Take this photo off your page? A look in the feed stays.')) {
                    removePhoto.mutate(photo.id);
                  }
                }}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
