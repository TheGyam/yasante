import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Camera, Check, ImagePlus } from 'lucide-react-native';
import { errorMessage, useAuth } from '@/features/auth';
import { dayLabel, useBookings } from '@/features/booking';
import { usePostLook, useStyleTaxonomy, type Style } from '@/features/looks';
import { TEXTURE_LABELS, useUser, useUserStore, type HairTexture } from '@/features/profile';
import { formatPrice, useActiveMode, useMenu, usePortfolio } from '@/features/stylist';
import { useImagePicker } from '@/shared/hooks/useImagePicker';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

const MAX_STYLES = 3;
const TEXTURES = Object.keys(TEXTURE_LABELS) as HairTexture[];

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  chosen: { aspectRatio: 0.8, borderRadius: radius.lg, overflow: 'hidden' },
  strip: { flexDirection: 'row', gap: space.sm, paddingVertical: space.xs },
  thumb: { width: 72, aspectRatio: 0.8, borderRadius: radius.sm },
  picked: { borderWidth: 2, borderColor: t.colors.accent },
  tick: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accent,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  group: { gap: space.sm },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/** The style a service is, when its name says so: "Knotless braids" is knotless. */
function styleFor(serviceName: string | undefined, taxonomy: Style[]) {
  if (!serviceName) return undefined;
  const name = serviceName.toLowerCase();
  return taxonomy.find(
    style => name.includes(style.name.toLowerCase()) || style.name.toLowerCase().includes(name)
  )?.id;
}

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
  const { pickFromLibrary } = useImagePicker();
  const { data: portfolio = [] } = usePortfolio();
  const { data: services = [] } = useMenu();
  const { data: done = [] } = useBookings('client', ['completed']);
  const { data: taxonomy = [] } = useStyleTaxonomy();
  const { user } = useAuth();
  const { data: account } = useUser(user?.id);
  const ownTexture = useUserStore(s => s.hairProfile?.texture);
  const post = usePostLook();

  const [photoUri, setPhotoUri] = useState<string>();
  const [serviceId, setServiceId] = useState<string>();
  const [bookingId, setBookingId] = useState(params.bookingId);
  const [picked, setPicked] = useState<string[]>([]);
  // A client's look is her own hair, so her texture is the likely answer.
  const [texture, setTexture] = useState<HairTexture | undefined>(() =>
    asStylist ? undefined : (account?.hairProfile?.texture ?? ownTexture)
  );
  const [caption, setCaption] = useState('');

  const suggest = (serviceName?: string) => {
    const id = styleFor(serviceName, taxonomy);
    if (id && !picked.includes(id)) setPicked(current => [id, ...current].slice(0, MAX_STYLES));
  };

  // Arriving from a finished appointment: the style is already known.
  useEffect(() => {
    const booking = done.find(b => b.id === params.bookingId);
    if (booking) suggest(booking.serviceName);
    // Only once the booking and the taxonomy are both in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done.length, taxonomy.length]);

  const choose = (uri: string, taggedWith?: string) => {
    setPhotoUri(uri);
    // A portfolio photo already knows what it is; don't make her say it twice.
    if (taggedWith) tagService(taggedWith);
  };

  const tagService = (id?: string) => {
    setServiceId(id);
    suggest(services.find(s => s.id === id)?.name);
  };

  const tagBooking = (id?: string) => {
    setBookingId(id);
    suggest(done.find(b => b.id === id)?.serviceName);
  };

  const toggleStyle = (id: string) =>
    setPicked(current =>
      current.includes(id)
        ? current.filter(s => s !== id)
        : current.length < MAX_STYLES
          ? [...current, id]
          : current
    );

  const addFromLibrary = async () => {
    try {
      const uri = await pickFromLibrary();
      if (uri) choose(uri);
    } catch {
      await notify({
        title: 'No access to your photos',
        message: 'Allow access in Settings to post a look.',
      });
    }
  };

  const share = async () => {
    if (!photoUri || !picked.length) return;
    try {
      const look = await post.mutateAsync({
        photoUri,
        serviceId: asStylist ? serviceId : undefined,
        bookingId: asStylist ? undefined : bookingId,
        styles: picked,
        hairTexture: texture,
        caption: caption.trim() || undefined,
      });
      haptics.success();
      router.replace(`/looks/${look.id}`);
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t post that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title="Post a look" modal keyboard testID="look-compose">
      <View style={styles.body}>
        {photoUri ? (
          <View style={styles.chosen}>
            <RemoteImage uri={photoUri} style={StyleSheet.absoluteFill} />
          </View>
        ) : (
          <Text variant="subhead" tone="secondary">
            {asStylist
              ? 'Pick a photo of work you did. Clients see it with your name on it.'
              : 'Show off your hair. Tag who did it, and people can book the same look.'}
          </Text>
        )}

        {asStylist && portfolio.length > 0 && (
          <View style={styles.group}>
            <Text variant="footnote" tone="secondary">
              From your portfolio
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.strip}>
                {portfolio.map((photo, index) => (
                  <PressableScale
                    key={photo.id}
                    onPress={() => choose(photo.uri, photo.serviceId)}
                    accessibilityLabel={`Portfolio photo ${index + 1}`}
                  >
                    <View>
                      <RemoteImage
                        uri={photo.uri}
                        style={[styles.thumb, photo.uri === photoUri && styles.picked]}
                        recyclingKey={photo.id}
                      />
                      {photo.uri === photoUri && (
                        <View style={styles.tick}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                  </PressableScale>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <Button
          label={photoUri ? 'Choose a different photo' : 'Choose a photo'}
          icon={photoUri ? ImagePlus : Camera}
          variant="secondary"
          onPress={addFromLibrary}
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
              Who did it? Only stylists you’ve had an appointment with can be tagged.
            </Text>
            <View style={styles.chips}>
              {done.map(booking => (
                <Chip
                  key={booking.id}
                  label={`${booking.stylistName} · ${dayLabel(booking.completedAt ?? booking.updatedAt)}`}
                  selected={bookingId === booking.id}
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
                onPress={() => toggleStyle(style.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <Text variant="footnote" tone="secondary">
            {asStylist ? 'Her hair type' : 'Your hair type'} — it’s how people with hair like it
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
          <Button
            label="Post it"
            onPress={share}
            disabled={!photoUri || !picked.length}
            loading={post.isPending}
            fullWidth
            testID="look-post"
          />
          {!!photoUri && !picked.length && (
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
