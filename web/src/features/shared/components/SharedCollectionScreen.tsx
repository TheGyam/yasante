import { Images } from 'lucide-react';
import { appLink } from '@/shared/lib/links';
import { plural, SEP } from '@/shared/lib/format';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Link } from '@/shared/ui/Link';
import { Page } from '@/shared/ui/Page';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Rise } from '@/shared/ui/Rise';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { updatedLabel } from '../format';
import { useSharedCollection } from '../hooks';
import type { SharedCollection } from '../types';
import { Author } from './Author';
import { Gone } from './Gone';
import { OpenInApp } from './OpenInApp';
import * as styles from './Shared.css';

/** yasante.com/c/<code>: a collection someone shared, for anyone without the app. */
export function SharedCollectionScreen({ code }: { code: string }) {
  const { data, isPending, error, refetch } = useSharedCollection(code);

  if (isPending) {
    return (
      <Page title="A collection" noIndex>
        <div className={styles.header} aria-busy>
          <Skeleton className={styles.mosaic} />
          <div className={styles.intro}>
            <Skeleton style={{ height: 34, width: '70%' }} />
            <Skeleton style={{ height: 44, width: '55%' }} />
          </div>
        </div>
      </Page>
    );
  }
  if (!data) return <Gone error={error} retry={() => refetch()} />;

  return (
    <Page
      title={`${data.name}, by ${data.author.name}`}
      description={`${plural(data.itemCount, 'thing')} saved, on Yasante.`}
      noIndex
    >
      <div className={styles.header}>
        <Mosaic uris={data.previewUris} name={data.name} />
        <Rise className={styles.intro}>
          <Text variant="title1">{data.name}</Text>
          <Author
            author={data.author}
            detail={`${plural(data.itemCount, 'item')}${SEP}${updatedLabel(data.updatedAt)}`}
          />
          <OpenInApp href={appLink.sharedCollection(code)} />
        </Rise>
      </div>

      {data.items.length ? (
        <ul className={styles.grid}>
          {data.items.map((item, i) => (
            <li key={item.id}>
              <Item item={item} priority={i < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Images} title="Nothing in here yet" />
      )}
    </Page>
  );
}

/** One large picture and two stacked, as the app shows it. */
function Mosaic({ uris, name }: { uris: string[]; name: string }) {
  const [first, second, third] = uris;
  return (
    <div className={styles.mosaic} role="img" aria-label={`Pictures from ${name}`}>
      <RemoteImage src={first} alt="" priority className={styles.mosaicMain} />
      <RemoteImage src={second} alt="" priority className={styles.mosaicTile} />
      <RemoteImage src={third} alt="" priority className={styles.mosaicTile} />
    </div>
  );
}

function Item({ item, priority }: { item: SharedCollection['items'][number]; priority: boolean }) {
  const picture = (
    <RemoteImage
      src={item.imageUri}
      alt={item.title ?? (item.kind === 'look' ? 'A look' : 'A guide')}
      aspect={4 / 5}
      priority={priority}
      className={styles.photo}
    />
  );
  // Looks have a page here; guides live in the app.
  return item.kind === 'look' ? (
    <Link to={`/looks/${item.refId}`} className={styles.tile}>
      {picture}
    </Link>
  ) : (
    <div className={styles.tile}>
      {picture}
      {item.title && (
        <Text variant="footnote" as="p">
          {item.title}
        </Text>
      )}
    </div>
  );
}
