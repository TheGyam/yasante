import { Fragment, useState } from 'react';
import { useLocation } from 'react-router';
import { Globe, ImagePlus, Lock, PenLine, Trash2 } from 'lucide-react';
import { useCheckFinishTags, useFinishState } from '@/features/claim';
import { usePortfolio, useRemovePortfolioPhoto } from '@/features/stylist';
import { errorMessage } from '@/shared/lib/errors';
import { plural, SEP } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Glass } from '@/shared/ui/Glass';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Link } from '@/shared/ui/Link';
import { Page } from '@/shared/ui/Page';
import { PhotoCount } from '@/shared/ui/PhotoCount';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useDeleteLook, useMyLooks, useStyles, useUpdateLook } from '../hooks';
import { HAIR_TEXTURES, lookAlt } from '../format';
import type { Look } from '../types';
import * as styles from './YourWork.css';

/** What she's posted: her looks in the feed, and the photos on her page. */
export function YourWorkScreen({ accountId }: { accountId: string }) {
  const posted = (useLocation().state as { posted?: number } | null)?.posted;
  const looks = useMyLooks();
  const portfolio = usePortfolio(accountId);
  const deleteLook = useDeleteLook();
  const removePhoto = useRemovePortfolioPhoto(accountId);
  const finish = useFinishState();
  const checkTags = useCheckFinishTags();
  const { data: styleList = [] } = useStyles();
  const updateLook = useUpdateLook();

  const [editingLookId, setEditingLookId] = useState<string | null>(null);
  const [editStyles, setEditStyles] = useState<string[]>([]);
  const [editHair, setEditHair] = useState<Look['hairTexture'] | undefined>(undefined);
  const [editError, setEditError] = useState<string | undefined>(undefined);

  const live = (looks.data ?? []).filter(l => l.visibility === 'public');
  const hidden = (looks.data ?? []).filter(l => l.visibility === 'private');
  const show = (look: Look, visibility: Look['visibility']) =>
    updateLook.mutate({ id: look.id, patch: { visibility } });
  const checking = !!finish.data && !finish.data.tagsChecked;
  const styleNames = (look: Look) =>
    (look.styles ?? [])
      .map(slug => styleList.find(s => s.id === slug)?.name)
      .filter(Boolean)
      .join(', ');
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
      {finish.data && !finish.data.tagsChecked && (
        <Glass padded radius="lg" className={styles.tagsCheckBanner}>
          <div>
            <Text variant="title3">Check your tags</Text>
            <Text variant="subhead" tone="secondary">
              We tagged your photos for you. Fix any we got wrong.
            </Text>
          </div>
          <Button
            label="These look right"
            loading={checkTags.isPending}
            onClick={() => checkTags.mutate()}
          />
        </Glass>
      )}
      {(deleteLook.isError || removePhoto.isError || checkTags.isError || updateLook.isError) && (
        <InlineAlert
          message={errorMessage(
            deleteLook.error ?? removePhoto.error ?? checkTags.error ?? updateLook.error,
            'Couldn’t update that.'
          )}
        />
      )}

      <SectionHeader title={`In the feed${live.length ? `${SEP}${live.length}` : ''}`} />
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
            <Fragment key={look.id}>
              <li className={styles.tile}>
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
                  className={styles.editButton}
                  aria-label={`Edit tags for ${lookAlt(look)}`}
                  onClick={() => {
                    if (editingLookId === look.id) {
                      setEditingLookId(null);
                    } else {
                      setEditingLookId(look.id);
                      setEditStyles(look.styles ?? []);
                      setEditHair(look.hairTexture);
                      setEditError(undefined);
                    }
                  }}
                >
                  <PenLine size={12} aria-hidden />
                  {/* While she's checking our tags, each photo says what it's tagged. */}
                  {checking ? styleNames(look) || 'No style' : 'Edit tags'}
                </button>
                <button
                  type="button"
                  className={styles.lock}
                  aria-label={`Make ${lookAlt(look)} just for you`}
                  title="Make it just for you: it leaves the feed, and its likes and comments come back if you show it again"
                  onClick={() => show(look, 'private')}
                >
                  <Lock size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${lookAlt(look)}`}
                  onClick={() => {
                    if (window.confirm('Remove this look from the feed? It goes for good.')) {
                      deleteLook.mutate(look.id);
                      // Its photo on her page goes with it: that photo linked here.
                      photos
                        .filter(p => p.lookId === look.id)
                        .forEach(p => removePhoto.mutate(p.id));
                    }
                  }}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </li>
              {editingLookId === look.id && (
                <li className={styles.tagEditor}>
                  <Glass padded radius="lg">
                    <div className={styles.editorBody}>
                      <div>
                        <Text variant="title3">Style (pick up to 3)</Text>
                        <Text variant="caption" tone="secondary">
                          Tap to choose what kind of style this is.
                        </Text>
                      </div>
                      <div className={styles.chipList}>
                        {styleList.map(s => {
                          const selected = editStyles.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className={`${styles.chip} ${selected ? styles.chipActive : ''}`}
                              onClick={() => {
                                if (selected) {
                                  setEditStyles(prev => prev.filter(x => x !== s.id));
                                } else if (editStyles.length < 3) {
                                  setEditStyles(prev => [...prev, s.id]);
                                }
                              }}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                      <div>
                        <Text variant="title3">Hair type</Text>
                        <Text variant="caption" tone="secondary">
                          Optional texture for this look.
                        </Text>
                      </div>
                      <div className={styles.chipList}>
                        {HAIR_TEXTURES.map(t => {
                          const selected = editHair === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              className={`${styles.chip} ${selected ? styles.chipActive : ''}`}
                              onClick={() => {
                                setEditHair(selected ? undefined : t.id);
                              }}
                            >
                              {t.name}
                            </button>
                          );
                        })}
                      </div>
                      {editError && <InlineAlert message={editError} />}
                      <div className={styles.editorActions}>
                        <Button
                          label="Save tags"
                          size="sm"
                          loading={updateLook.isPending}
                          onClick={async () => {
                            if (editStyles.length === 0) {
                              setEditError('Tag at least one style.');
                              return;
                            }
                            try {
                              await updateLook.mutateAsync({
                                id: look.id,
                                patch: { styles: editStyles, hairTexture: editHair ?? null },
                              });
                              setEditingLookId(null);
                            } catch (err) {
                              setEditError(errorMessage(err, 'Couldn’t save tags. Try again.'));
                            }
                          }}
                        />
                        <Button
                          label="Cancel"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingLookId(null)}
                        />
                      </div>
                    </div>
                  </Glass>
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      )}

      {hidden.length > 0 && (
        <>
          <SectionHeader title="Just for you" />
          <Text variant="subhead" tone="secondary">
            Only you can see these. Shown to everyone, a look goes in the feed at the date you
            posted it.
          </Text>
          <ul className={styles.grid}>
            {hidden.map(look => (
              <li key={look.id} className={styles.tile}>
                <Link to={`/looks/${look.id}`}>
                  <RemoteImage
                    src={look.thumbUri ?? look.photoUri}
                    alt={lookAlt(look)}
                    aspect={4 / 5}
                  />
                </Link>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => {
                    if (window.confirm('Show this look to everyone? It goes in the feed.')) {
                      show(look, 'public');
                    }
                  }}
                >
                  <Globe size={12} aria-hidden />
                  Show to everyone
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionHeader title={`On your page${photos.length ? `${SEP}${photos.length}` : ''}`} />
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
