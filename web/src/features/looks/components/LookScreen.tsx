import {
  CalendarPlus,
  Heart,
  ImageOff,
  MessageCircle,
  Scissors,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';
import { usePrefetchStylist } from '@/features/stylist';
import { errorMessage, isNotFound } from '@/shared/lib/errors';
import { appLink } from '@/shared/lib/links';
import { formatMonth, plural } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Page } from '@/shared/ui/Page';
import { Rise } from '@/shared/ui/Rise';
import { Section } from '@/shared/ui/Section';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useLook, useStyleNames } from '../hooks';
import { lookAlt, lookPrice, lookTitle } from '../format';
import { LookGrid } from './LookGrid';
import { LookPhotos } from './LookPhotos';
import * as styles from './LookScreen.css';

/** One look: the photo, who did it, and a way to book it in the app. */
export function LookScreen({ id }: { id: string }) {
  const { data: look, isPending, error, refetch } = useLook(id);
  const styleNames = useStyleNames();
  const prefetchStylist = usePrefetchStylist();

  if (isPending) {
    return (
      <Page title="A look">
        <div className={styles.layout} aria-busy>
          <Skeleton className={styles.skeletonPhoto} />
          <div className={styles.details}>
            <Skeleton style={{ height: 34, width: '70%' }} />
            <Skeleton style={{ height: 20, width: '40%' }} />
          </div>
        </div>
      </Page>
    );
  }

  if (!look) {
    return (
      <Page title={isNotFound(error) ? 'Look not found' : 'Couldn’t load this look'}>
        <EmptyState
          as="h1"
          icon={ImageOff}
          title={isNotFound(error) ? 'This look isn’t here any more' : 'Couldn’t load this look'}
          body={
            isNotFound(error)
              ? 'It may have been taken down by the person who posted it.'
              : errorMessage(error, 'Please try again in a moment.')
          }
          action={
            isNotFound(error) ? (
              <Button label="See other looks" variant="secondary" size="md" to="/looks" />
            ) : (
              <Button label="Try again" variant="secondary" size="md" onClick={() => refetch()} />
            )
          }
        />
      </Page>
    );
  }

  const title = lookTitle(look);
  const price = lookPrice(look);
  const firstStyle = look.styles[0];
  const photos =
    look.photos.length > 0
      ? look.photos
      : [
          {
            uri: look.photoUri,
            thumbUri: look.thumbUri,
            feedUri: look.feedUri,
            aspect: look.photoAspect ?? 4 / 5,
          },
        ];

  return (
    <Page title={title} description={look.caption?.slice(0, 150) || `${title}, on Yasante.`}>
      <div className={styles.layout}>
        <LookPhotos
          photos={photos}
          alt={lookAlt(look)}
          aspect={photos[0].aspect}
          sizes="(min-width: 860px) 560px, 100vw"
          className={styles.photo}
        />

        <Rise className={styles.details}>
          <div className={styles.author}>
            <Avatar name={look.authorName} uri={look.authorAvatarUri} size={44} />
            <div>
              <Text variant="callout" as="p">
                {look.authorName}
              </Text>
              <Text variant="footnote" tone="secondary" as="p">
                {[look.area, formatMonth(look.createdAt)].filter(Boolean).join(' · ')}
              </Text>
            </div>
          </div>

          <Text variant="title1">{title}</Text>

          {look.caption && (
            <Text variant="body" className={styles.caption}>
              {look.caption}
            </Text>
          )}

          {look.styles.length > 0 && (
            <div className={styles.tags}>
              {look.styles.map(slug => (
                <Chip key={slug} label={styleNames.get(slug) ?? slug} to={`/styles/${slug}`} />
              ))}
            </div>
          )}

          {(look.likeCount > 0 || look.commentCount > 0) && (
            <div className={styles.counts}>
              {look.likeCount > 0 && (
                <Text variant="subhead" tone="secondary" className={styles.count}>
                  <Heart size={15} aria-hidden /> {plural(look.likeCount, 'like')}
                </Text>
              )}
              {look.commentCount > 0 && (
                <Text variant="subhead" tone="secondary" className={styles.count}>
                  <MessageCircle size={15} aria-hidden /> {plural(look.commentCount, 'comment')}
                </Text>
              )}
            </div>
          )}

          <div className={styles.actions}>
            {look.stylist?.handle && look.serviceId ? (
              <Button
                label="Book this look"
                icon={CalendarPlus}
                to={`/book/${look.stylist.handle}?service=${look.serviceId}&look=${look.id}`}
              />
            ) : (
              <Button label="Open in the app" icon={Smartphone} href={appLink.look(look.id)} />
            )}
            {look.stylist?.handle && (
              <Button
                label={`See ${look.stylist.name}’s page`}
                variant="secondary"
                to={`/${look.stylist.handle}`}
                preload={() => prefetchStylist(look.stylist!.handle!)}
              />
            )}
          </div>

          {(look.stylist || look.products.length > 0) && (
            <div>
              {look.stylist && (
                <Section title="Done by">
                  <ListRow
                    icon={Scissors}
                    title={look.stylist.name}
                    subtitle={look.serviceName}
                    value={price}
                    to={look.stylist.handle ? `/${look.stylist.handle}` : undefined}
                    preload={() => look.stylist?.handle && prefetchStylist(look.stylist.handle)}
                  />
                </Section>
              )}
              {look.products.length > 0 && (
                <Section title="Products used">
                  {look.products.map(product => (
                    <ListRow
                      key={product.id}
                      icon={ShoppingBag}
                      iconTone="neutral"
                      title={product.name}
                      subtitle={product.brand}
                    />
                  ))}
                </Section>
              )}
            </div>
          )}
        </Rise>
      </div>

      {firstStyle && (
        <>
          <SectionHeader
            title={`More ${styleNames.get(firstStyle) ?? 'like this'}`}
            action={{ label: 'See all', to: `/looks?style=${firstStyle}` }}
          />
          <LookGrid filters={{ style: firstStyle }} limit={9} exclude={look.id} />
        </>
      )}
    </Page>
  );
}
