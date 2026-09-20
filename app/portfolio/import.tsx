import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { X } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import { PhotoTagSheet, useAddPhotos, useMenu, type PortfolioPhotoDraft } from '@/features/stylist';
import { useImagePicker } from '@/shared/hooks/useImagePicker';
import { haptics } from '@/shared/lib/haptics';
import { useRouter, withoutThrottle } from '@/shared/lib/navigation';
import { makeStyles, radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { notify } from '@/shared/ui/dialog';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

const LIMIT = 20;

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  heading: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '31%', gap: space.xs },
  photo: { width: '100%', aspectRatio: 0.8, borderRadius: radius.sm },
  drop: { position: 'absolute', top: space.xs, right: space.xs },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/**
 * A batch of photos, tagged before they land. Most of a batch is one style, so a
 * single tap tags the lot and a tap on a tile fixes the odd one out.
 */
export default function ImportPhotosScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { pickManyFromLibrary } = useImagePicker();
  const { data: services = [] } = useMenu();
  const addPhotos = useAddPhotos();

  const [photos, setPhotos] = useState<PortfolioPhotoDraft[]>([]);
  const [picking, setPicking] = useState(true);
  /** Which tile's tag sheet is open. The chips above tag the whole batch. */
  const [tagging, setTagging] = useState<number>();

  // The picker is the whole point of this screen, so it opens with it. Nothing
  // chosen means she changed her mind, and there's nothing here to show her.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    // Leaving straight after arriving is the one time two navigations are meant.
    const leave = () => withoutThrottle(() => router.back());
    (async () => {
      try {
        const uris = await pickManyFromLibrary(LIMIT);
        if (!uris.length) {
          leave();
          return;
        }
        setPhotos(uris.map(uri => ({ uri })));
      } catch {
        await notify({
          title: 'No access to your photos',
          message: 'Allow access in Settings to add your work.',
        });
        leave();
      } finally {
        setPicking(false);
      }
    })();
  }, [pickManyFromLibrary, router]);

  const tagAll = (serviceId?: string) =>
    setPhotos(current => current.map(photo => ({ ...photo, serviceId })));

  const tagOne = (index: number, serviceId?: string) =>
    setPhotos(current =>
      current.map((photo, i) => (i === index ? { ...photo, serviceId } : photo))
    );

  const drop = (index: number) => {
    haptics.light();
    setPhotos(current => current.filter((_, i) => i !== index));
  };

  const sharedTag =
    photos.length && photos.every(photo => photo.serviceId === photos[0].serviceId)
      ? photos[0].serviceId
      : undefined;

  const save = async () => {
    try {
      await addPhotos.mutateAsync(photos);
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t add those',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  const nameOf = (serviceId?: string) => services.find(s => s.id === serviceId)?.name;

  return (
    <Screen title="Add your work" modal testID="portfolio-import">
      <View style={styles.body}>
        {picking ? (
          <Skeleton height={220} />
        ) : (
          <>
            {services.length > 0 && (
              <View style={styles.heading}>
                <Text variant="subhead" tone="secondary">
                  Tag the whole batch, then fix any that are different.
                </Text>
                <View style={styles.chips}>
                  {services.map(service => (
                    <Chip
                      key={service.id}
                      label={service.name}
                      selected={sharedTag === service.id}
                      onPress={() => tagAll(service.id)}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.grid}>
              {photos.map((photo, index) => (
                <View key={photo.uri} style={styles.tile}>
                  <PressableScale
                    onPress={() => setTagging(index)}
                    accessibilityLabel={`Photo ${index + 1}, ${nameOf(photo.serviceId) ?? 'no service'}`}
                  >
                    <RemoteImage uri={photo.uri} style={styles.photo} />
                  </PressableScale>
                  <IconButton
                    icon={X}
                    variant="overlay"
                    size={28}
                    style={styles.drop}
                    accessibilityLabel={`Leave out photo ${index + 1}`}
                    onPress={() => drop(index)}
                  />
                  <Text variant="caption" tone={photo.serviceId ? 'secondary' : 'tertiary'}>
                    {nameOf(photo.serviceId) ?? 'No tag'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <Button
                label={photos.length === 1 ? 'Add 1 photo' : `Add ${photos.length} photos`}
                onPress={save}
                disabled={!photos.length}
                loading={addPhotos.isPending}
                fullWidth
                testID="import-save"
              />
              <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
            </View>
          </>
        )}
      </View>

      <PhotoTagSheet
        visible={tagging !== undefined}
        onClose={() => setTagging(undefined)}
        services={services}
        value={tagging === undefined ? undefined : photos[tagging]?.serviceId}
        onChange={serviceId => {
          if (tagging !== undefined) tagOne(tagging, serviceId);
        }}
      />
    </Screen>
  );
}
