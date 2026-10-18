import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { errorMessage, useAuth } from '@/features/auth';
import { dayLabel, useBookings } from '@/features/booking';
import {
  PhotoUploadError,
  styleForService,
  usePostLook,
  useStyleTaxonomy,
  type LookVisibility,
  type UploadCache,
} from '@/features/looks';
import { useShelf } from '@/features/shelf';
import {
  TEXTURE_LABELS,
  useNeedsUsername,
  useUser,
  useUserStore,
  type HairTexture,
} from '@/features/profile';
import { formatPrice, useActiveMode, useMenu, usePortfolio } from '@/features/stylist';
import { useImagePicker } from '@/shared/hooks/useImagePicker';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { notify } from '@/shared/ui/dialog';
import { IconButton } from '@/shared/ui/IconButton';
import { Input } from '@/shared/ui/Input';
import { PressableScale } from '@/shared/ui/PressableScale';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Text } from '@/shared/ui/Text';

const MAX_STYLES = 3;
const MAX_PHOTOS = 5;
const VISIBILITY = [
  { value: 'public', label: 'Everyone' },
  { value: 'private', label: 'Just me' },
] as const;
const TEXTURES = Object.keys(TEXTURE_LABELS) as HairTexture[];

/** A chosen thumbnail's width, plus the gap after it — a drag moves in units of this.
 * 5 of these plus their gaps must fit the narrowest phone we support (375pt). */
const THUMB_WIDTH = 60;
const THUMB_GAP = space.sm;
const SLOT_WIDTH = THUMB_WIDTH + THUMB_GAP;

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  strip: { flexDirection: 'row', gap: THUMB_GAP, paddingVertical: space.xs },
  thumb: { width: THUMB_WIDTH, aspectRatio: 0.8, borderRadius: radius.sm },
  picked: { borderWidth: 2, borderColor: t.colors.accent },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accent,
  },
  badgeText: { color: t.colors.text.onAccent },
  remove: { position: 'absolute', top: -6, right: -6 },
  chosenThumb: { width: THUMB_WIDTH, aspectRatio: 0.8, borderRadius: radius.sm, zIndex: 1 },
  stripCount: { marginTop: -space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  group: { gap: space.sm },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/** "coily hair", but "zig-zag coils" — the word hair only where it reads. */
const hairLabel = (label: string) =>
  (/coils$/i.test(label) ? label : `${label} hair`).toLowerCase();

/**
 * Posting a look. A stylist posts her own work, and most of the time the picture
 * is already in her portfolio. A client posts her hair, and credits her stylist
 * through the booking — never by typing a name, so nobody can be credited for
 * work they didn't do.
 */
export default function ComposeLookScreen() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const asStylist = useActiveMode() === 'stylist';
  const { pickManyFromLibrary, error: pickError } = useImagePicker();
  const { data: portfolio = [] } = usePortfolio();
  const { data: services = [] } = useMenu();
  const { data: done = [] } = useBookings('client', ['completed']);
  const { data: taxonomy = [] } = useStyleTaxonomy();
  const { user } = useAuth();
  const { data: account } = useUser(user?.id);
  const needsUsername = useNeedsUsername();
  const ownTexture = useUserStore(s => s.hairProfile?.texture);
  const post = usePostLook();
  // Lives for the composer's whole life, so a retry after a failed upload only
  // re-sends the photos that didn't make it, not the ones that already did.
  const uploadCache = useRef<UploadCache>(new Map()).current;

  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [failedPhotoIndex, setFailedPhotoIndex] = useState<number>();
  const [serviceId, setServiceId] = useState<string>();
  const [bookingId, setBookingId] = useState(params.bookingId);
  const [picked, setPicked] = useState<string[]>([]);
  // A client's look is her own hair, and her hair profile already says what it is.
  // Only a stylist — posting someone else's hair — or a client who hasn't said, picks.
  const profileTexture = asStylist ? undefined : (account?.hairProfile?.texture ?? ownTexture);
  const [texture, setTexture] = useState<HairTexture>();

  // Posted from a finished appointment: who did it and what it was are facts of the
  // booking, so they're set and can't be taken off. More styles can still be added.
  const fromBooking = asStylist ? undefined : done.find(b => b.id === params.bookingId);
  const lockedStyle = fromBooking ? styleForService(fromBooking.serviceName, taxonomy) : undefined;
  const [caption, setCaption] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<LookVisibility>('public');
  const { data: shelf = [] } = useShelf();

  const suggest = (serviceName?: string) => {
    const id = styleForService(serviceName, taxonomy);
    if (id && !picked.includes(id)) setPicked(current => [id, ...current].slice(0, MAX_STYLES));
  };

  // Arriving from a finished appointment: the style is already known.
  useEffect(() => {
    const booking = done.find(b => b.id === params.bookingId);
    if (booking) suggest(booking.serviceName);
    // Only once the booking and the taxonomy are both in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done.length, taxonomy.length]);

  // The list changed under it (removed, reordered, added to) — whatever failed before
  // isn't necessarily at that index any more.
  useEffect(() => setFailedPhotoIndex(undefined), [photoUris]);

  useEffect(() => {
    if (pickError) {
      notify({
        title: 'No access to your photos',
        message: 'Allow access in Settings to post a look.',
      });
    }
  }, [pickError]);

  // A portfolio photo tapped a second time comes back off; tapping it on tags its service.
  const togglePortfolio = (uri: string, taggedWith?: string) => {
    if (photoUris.includes(uri)) return setPhotoUris(current => current.filter(u => u !== uri));
    if (photoUris.length >= MAX_PHOTOS) return;
    setPhotoUris(current => [...current, uri]);
    if (taggedWith) tagService(taggedWith);
  };

  const removeUri = (uri: string) => setPhotoUris(current => current.filter(u => u !== uri));

  const reorder = (from: number, to: number) =>
    setPhotoUris(current => {
      if (from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const tagService = (id?: string) => {
    setServiceId(id);
    suggest(services.find(s => s.id === id)?.name);
  };

  const tagBooking = (id?: string) => {
    setBookingId(id);
    suggest(done.find(b => b.id === id)?.serviceName);
  };

  const toggleStyle = (id: string) => {
    if (id === lockedStyle) return;
    setPicked(current =>
      current.includes(id)
        ? current.filter(s => s !== id)
        : current.length < MAX_STYLES
          ? [...current, id]
          : current
    );
  };

  const addFromLibrary = async () => {
    const added = await pickManyFromLibrary(MAX_PHOTOS - photoUris.length);
    if (added.length) setPhotoUris(current => [...current, ...added].slice(0, MAX_PHOTOS));
  };

  const share = async () => {
    if (!photoUris.length || !picked.length) return;
    // The post shows her username: asked for first, and her draft waits here.
    if (needsUsername) return router.push('/username');
    setFailedPhotoIndex(undefined);
    try {
      const look = await post.mutateAsync({
        draft: {
          photoUris,
          serviceId: asStylist ? serviceId : undefined,
          bookingId: asStylist ? undefined : bookingId,
          styles: picked,
          hairTexture: profileTexture ?? texture,
          productIds,
          visibility,
          caption: caption.trim() || undefined,
        },
        cache: uploadCache,
        onProgress: setProgress,
      });
      haptics.success();
      router.replace(`/looks/${look.id}`);
    } catch (error) {
      haptics.error();
      setProgress(undefined);
      if (error instanceof PhotoUploadError) {
        setFailedPhotoIndex(error.photoIndex);
      } else {
        await notify({
          title: 'Couldn’t post that',
          message: errorMessage(error, 'Check your connection and try again.'),
        });
      }
    }
  };

  return (
    <Screen title="Post a look" modal keyboard testID="look-compose">
      <View style={styles.body}>
        {photoUris.length === 0 && (
          <Text variant="subhead" tone="secondary">
            {asStylist
              ? 'Pick up to 5 photos of work you did. Clients see them with your name on it.'
              : 'Show off your hair. Tag who did it, and people can book the same look.'}
          </Text>
        )}

        {photoUris.length > 0 && (
          <View style={styles.group}>
            <Text variant="footnote" tone="secondary" style={styles.stripCount}>
              {photoUris.length}/{MAX_PHOTOS}
            </Text>
            <ChosenStrip
              uris={photoUris}
              onRemove={removeUri}
              onReorder={reorder}
              failedIndex={failedPhotoIndex}
            />
          </View>
        )}

        {asStylist && portfolio.length > 0 && (
          <View style={styles.group}>
            <Text variant="footnote" tone="secondary">
              From your portfolio
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.strip}>
                {portfolio.map((photo, index) => {
                  const order = photoUris.indexOf(photo.uri);
                  return (
                    <PressableScale
                      key={photo.id}
                      onPress={() => togglePortfolio(photo.uri, photo.serviceId)}
                      disabled={order < 0 && photoUris.length >= MAX_PHOTOS}
                      accessibilityLabel={`Portfolio photo ${index + 1}${order >= 0 ? `, chosen as number ${order + 1}` : ''}`}
                    >
                      <View>
                        <RemoteImage
                          uri={photo.uri}
                          style={[styles.thumb, order >= 0 && styles.picked]}
                          recyclingKey={photo.id}
                        />
                        {order >= 0 && (
                          <View style={styles.badge}>
                            <Text variant="caption" style={styles.badgeText}>
                              {order + 1}
                            </Text>
                          </View>
                        )}
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        <Button
          label={
            photoUris.length === 0
              ? 'Choose photos'
              : photoUris.length >= MAX_PHOTOS
                ? '5 of 5'
                : 'Add more photos'
          }
          icon={photoUris.length === 0 ? Camera : ImagePlus}
          variant="secondary"
          onPress={addFromLibrary}
          disabled={photoUris.length >= MAX_PHOTOS}
          fullWidth
          testID="look-pick"
        />

        {asStylist && services.length > 0 && (
          <View style={styles.group}>
            <Text variant="footnote" tone="secondary">
              Which service? Tagging it shows your price and lets people book it.
            </Text>
            <View style={styles.chips}>
              {services.map(service => (
                <Chip
                  key={service.id}
                  label={`${service.name} · ${formatPrice(service)}`}
                  selected={serviceId === service.id}
                  onPress={() => tagService(serviceId === service.id ? undefined : service.id)}
                />
              ))}
            </View>
          </View>
        )}

        {!asStylist && done.length > 0 && (
          <View style={styles.group}>
            <Text variant="footnote" tone="secondary">
              {fromBooking
                ? 'Who did it — from your appointment.'
                : 'Who did it? Only stylists you’ve had an appointment with can be tagged.'}
            </Text>
            <View style={styles.chips}>
              {(fromBooking ? [fromBooking] : done).map(booking => (
                <Chip
                  key={booking.id}
                  label={`${booking.stylistName} · ${dayLabel(booking.completedAt ?? booking.updatedAt)}`}
                  selected={bookingId === booking.id}
                  locked={!!fromBooking}
                  onPress={() => tagBooking(bookingId === booking.id ? undefined : booking.id)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary">
            What style is it? Pick up to {MAX_STYLES}.
          </Text>
          <View style={styles.chips}>
            {taxonomy.map(style => (
              <Chip
                key={style.id}
                label={style.name}
                selected={picked.includes(style.id)}
                locked={style.id === lockedStyle}
                onPress={() => toggleStyle(style.id)}
              />
            ))}
          </View>
        </View>

        {profileTexture ? (
          <Text variant="footnote" tone="secondary">
            Tagged as {hairLabel(TEXTURE_LABELS[profileTexture])}, from your hair profile — it’s how
            people with hair like yours find this.
          </Text>
        ) : (
          <View style={styles.group}>
            <Text variant="footnote" tone="secondary">
              {asStylist ? 'Their hair type' : 'Your hair type'} — it’s how people with hair like it
              find this.
            </Text>
            <View style={styles.chips}>
              {TEXTURES.map(value => (
                <Chip
                  key={value}
                  label={TEXTURE_LABELS[value]}
                  selected={texture === value}
                  onPress={() => setTexture(texture === value ? undefined : value)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary">
            {shelf.length
              ? 'What went on it? From your shelf, up to five.'
              : 'Add products to your shelf and you can tag what went on it.'}
          </Text>
          {shelf.length > 0 && (
            <View style={styles.chips}>
              {shelf.map(item => {
                const on = productIds.includes(item.product.id);
                return (
                  <Chip
                    key={item.id}
                    label={`${item.product.brand} ${item.product.name}`}
                    selected={on}
                    onPress={() =>
                      setProductIds(current =>
                        on
                          ? current.filter(id => id !== item.product.id)
                          : current.length < 5
                            ? [...current, item.product.id]
                            : current
                      )
                    }
                  />
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary">
            Who sees it
          </Text>
          <SegmentedControl options={VISIBILITY} value={visibility} onChange={setVisibility} />
          <Text variant="caption" tone="tertiary">
            {visibility === 'public'
              ? 'In the feed and on the web, with your name on it.'
              : 'A record for yourself. It never appears in the feed.'}
          </Text>
        </View>

        <Input
          label="Say something about it"
          value={caption}
          onChangeText={setCaption}
          placeholder={
            asStylist
              ? 'Knotless, waist length, done in one sitting.'
              : 'Two weeks in and still neat.'
          }
          multiline
          style={{ minHeight: 88 }}
        />

        <View style={styles.footer}>
          {!!progress && (
            <ProgressBar progress={progress.total ? progress.done / progress.total : 0} />
          )}
          {failedPhotoIndex !== undefined && (
            <Text variant="caption" tone="danger" align="center">
              Photo {failedPhotoIndex + 1} couldn’t be uploaded. Check your connection.
            </Text>
          )}
          <Button
            label={failedPhotoIndex !== undefined ? 'Try again' : 'Post it'}
            onPress={share}
            disabled={!photoUris.length || !picked.length}
            loading={post.isPending}
            fullWidth
            testID="look-post"
          />
          {!!photoUris.length && !picked.length && (
            <Text variant="caption" tone="tertiary" align="center">
              Tag the style so people can find it.
            </Text>
          )}
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
        </View>
      </View>
    </Screen>
  );
}

/**
 * The chosen photos, numbered in the order they'll post — the first is "Cover".
 * Long-press and drag one to reorder; the cross removes it.
 */
function ChosenStrip({
  uris,
  onRemove,
  onReorder,
  failedIndex,
}: {
  uris: string[];
  onRemove: (uri: string) => void;
  onReorder: (from: number, to: number) => void;
  failedIndex?: number;
}) {
  const styles = useStyles();
  // Shared across every thumb, so dragging one tells its neighbours to make room.
  const dragIndex = useSharedValue(-1);
  const dragX = useSharedValue(0);
  const targetIndex = useSharedValue(-1);

  return (
    <View style={styles.strip}>
      {uris.map((uri, index) => (
        <ChosenThumb
          key={uri}
          uri={uri}
          index={index}
          total={uris.length}
          failed={index === failedIndex}
          dragIndex={dragIndex}
          dragX={dragX}
          targetIndex={targetIndex}
          onRemove={() => onRemove(uri)}
          onReorder={onReorder}
        />
      ))}
    </View>
  );
}

function ChosenThumb({
  uri,
  index,
  total,
  failed,
  dragIndex,
  dragX,
  targetIndex,
  onRemove,
  onReorder,
}: {
  uri: string;
  index: number;
  total: number;
  failed?: boolean;
  dragIndex: SharedValue<number>;
  dragX: SharedValue<number>;
  targetIndex: SharedValue<number>;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
}) {
  const styles = useStyles();
  const theme = useTheme();

  const pan = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      dragIndex.set(index);
      targetIndex.set(index);
    })
    .onUpdate(e => {
      dragX.set(e.translationX);
      const raw = index + Math.round(e.translationX / SLOT_WIDTH);
      targetIndex.set(Math.min(total - 1, Math.max(0, raw)));
    })
    .onEnd(() => {
      const to = targetIndex.get();
      dragIndex.set(-1);
      dragX.set(0);
      targetIndex.set(-1);
      scheduleOnRN(onReorder, index, to);
    });

  const style = useAnimatedStyle(() => {
    const dragging = dragIndex.get();
    if (dragging === index) {
      return { transform: [{ translateX: dragX.get() }, { scale: 1.05 }], zIndex: 10 };
    }
    if (dragging < 0) return { transform: [{ translateX: 0 }] };
    // Slide out of the way while the dragged thumb passes over this slot.
    const target = targetIndex.get();
    const shift =
      dragging < index && index <= target
        ? -SLOT_WIDTH
        : dragging > index && index >= target
          ? SLOT_WIDTH
          : 0;
    return { transform: [{ translateX: shift }], zIndex: 1 };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>
        <RemoteImage
          uri={uri}
          style={[
            styles.chosenThumb,
            failed && { borderWidth: 2, borderColor: theme.colors.danger },
          ]}
        />
        <View style={styles.badge}>
          <Text variant="caption" style={styles.badgeText}>
            {index === 0 ? 'Cover' : index + 1}
          </Text>
        </View>
        <IconButton
          icon={X}
          variant="overlay"
          size={22}
          accessibilityLabel={`Remove photo ${index + 1}`}
          onPress={onRemove}
          style={styles.remove}
        />
      </Animated.View>
    </GestureDetector>
  );
}
