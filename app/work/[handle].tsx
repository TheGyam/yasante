import { useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarPlus, Images, PenLine, X } from 'lucide-react-native';
import {
  formatPrice,
  PhotoTagSheet,
  useMenu,
  useMyCurrency,
  usePortfolio,
  useRemovePhoto,
  useStylistPage,
  useUpdatePhoto,
  type PortfolioPhoto,
} from '@/features/stylist';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm } from '@/shared/ui/dialog';
import { Glass } from '@/shared/ui/Glass';
import { IconButton } from '@/shared/ui/IconButton';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';

// The photo that's mostly on screen is the one the count and the card describe.
const VIEWABLE = { itemVisiblePercentThreshold: 60 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  top: {
    position: 'absolute',
    left: GUTTER,
    right: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: { color: '#fff' },
  bottom: { position: 'absolute', left: GUTTER, right: GUTTER },
  card: { gap: space.md, padding: space.lg },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1 },
});

/**
 * A stylist's work, one photo at a time, full screen: swipe through, see what each
 * one is and what it costs, and book it from the picture. Opened from their page,
 * or from their own portfolio (`mine`), where each photo can be retagged or removed.
 */
export default function WorkViewer() {
  const {
    handle,
    index = '0',
    mine: mineParam,
  } = useLocalSearchParams<{ handle: string; index?: string; mine?: string }>();
  const mine = mineParam === '1';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Already cached: the page or portfolio it's opened from just loaded it.
  const { data: page } = useStylistPage(mine ? undefined : handle);
  const { data: ownPhotos } = usePortfolio();
  const { data: ownMenu = [] } = useMenu();
  const ownCurrency = useMyCurrency();
  const data = mine ? ownPhotos && { photos: ownPhotos, menu: ownMenu, profile: undefined } : page;
  const retag = useUpdatePhoto();
  const remove = useRemovePhoto();
  const [editing, setEditing] = useState(false);
  const start = Math.max(0, Number(index) || 0);
  const [current, setCurrent] = useState(-1);
  // FlatList wants the same function for its whole life.
  const onViewable = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    const shown = viewableItems[0]?.index;
    if (shown != null) setCurrent(shown);
  }).current;

  const photos = data?.photos ?? [];
  // A look posted as several photos swipes through all of them, in order, before the
  // next piece of work.
  const pages = photos.flatMap((item, at) =>
    (item.lookPhotos ?? [{ uri: item.uri, thumbUri: item.thumbUri }]).map((shot, part) => ({
      item,
      at,
      part,
      parts: item.lookPhotos?.length ?? 1,
      uri: shot.uri,
      thumbUri: shot.thumbUri,
    }))
  );
  const firstPage = Math.max(
    0,
    pages.findIndex(p => p.at === start)
  );
  const page_ = pages[current < 0 ? firstPage : current];
  const photo = page_?.item;
  const service = data?.menu.find(item => item.id === photo?.serviceId);

  const renderItem = ({ item: shot }: { item: (typeof pages)[number] }) => (
    <View style={{ width, height }}>
      <RemoteImage
        uri={shot.uri}
        placeholderUri={shot.thumbUri}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        recyclingKey={`${shot.item.id}-${shot.part}`}
        priority="high"
        accessibilityLabel={[
          data?.menu.find(m => m.id === shot.item.serviceId)?.name ?? 'Their work',
          shot.parts > 1 ? `photo ${shot.part + 1} of ${shot.parts} in this look` : '',
        ]
          .filter(Boolean)
          .join(', ')}
      />
    </View>
  );

  return (
    <View style={styles.screen} testID="work-viewer">
      <StatusBar style="light" />
      <FlatList
        data={pages}
        keyExtractor={shot => `${shot.item.id}-${shot.part}`}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={firstPage}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={VIEWABLE}
        windowSize={3}
        initialNumToRender={1}
      />

      <View style={[styles.top, { top: insets.top + space.sm }]}>
        <IconButton
          icon={X}
          variant="overlay"
          accessibilityLabel="Close"
          onPress={() => router.back()}
        />
        {!!page_ && (photos.length > 1 || page_.parts > 1) && (
          <Text variant="subhead" style={styles.count} accessibilityLiveRegion="polite">
            {page_.at + 1} of {photos.length}
            {page_.parts > 1 ? ` · photo ${page_.part + 1} of ${page_.parts}` : ''}
          </Text>
        )}
      </View>

      {!!data && !!photo && (mine || service || photo.lookId) && (
        <View style={[styles.bottom, { bottom: insets.bottom + space.lg }]}>
          <Glass radius={radius.xl} style={styles.card}>
            {service && (
              <View>
                <Text variant="title3">{service.name}</Text>
                <Text variant="subhead" tone="secondary">
                  {data.profile
                    ? `${formatPrice(service, data.profile.currency ?? ownCurrency)} with ${data.profile.displayName}`
                    : formatPrice(service, ownCurrency)}
                </Text>
              </View>
            )}
            {mine && !service && (
              <Text variant="subhead" tone="secondary">
                Not tagged yet. Tag it and clients see its price beside it.
              </Text>
            )}
            <View style={styles.actions}>
              {mine && (
                <Button
                  label={service ? 'Edit' : 'Tag it'}
                  icon={PenLine}
                  variant="secondary"
                  size="md"
                  onPress={() => setEditing(true)}
                  style={styles.action}
                  testID="work-edit"
                />
              )}
              {photo?.lookId && (
                <Button
                  label="See the look"
                  icon={Images}
                  variant="secondary"
                  size="md"
                  onPress={() => router.push(`/looks/${photo.lookId}`)}
                  style={styles.action}
                />
              )}
              {service && !mine && (
                <Button
                  label="Book this"
                  icon={CalendarPlus}
                  size="md"
                  onPress={() => router.push(`/book/${handle}?service=${service.id}`)}
                  style={styles.action}
                  testID="work-book"
                />
              )}
            </View>
          </Glass>
        </View>
      )}

      {mine && (
        <PhotoTagSheet
          visible={editing && !!photo}
          onClose={() => setEditing(false)}
          services={ownMenu}
          value={photo?.serviceId}
          onChange={serviceId => photo && retag.mutate({ id: photo.id, serviceId })}
          onRemove={async () => {
            if (!photo) return;
            const yes = await confirm({
              title: 'Remove this photo?',
              message: 'It comes off your page straight away.',
              confirmLabel: 'Remove',
              destructive: true,
            });
            if (!yes) return;
            remove.mutate(photo.id);
            // The last one gone: nothing left to look at.
            if (photos.length <= 1) router.back();
            else setCurrent(i => Math.max(0, Math.min(i, pages.length - 2)));
          }}
        />
      )}
    </View>
  );
}
