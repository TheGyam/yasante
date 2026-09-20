import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Camera, Check, ImagePlus } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import { usePostLook } from '@/features/looks';
import { formatPrice, useMenu, usePortfolio } from '@/features/stylist';
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

/**
 * Posting a look. Most of the time the picture is already in her portfolio, so
 * that's the first place it's offered — the camera roll is the fallback, not the
 * default.
 */
export default function ComposeLookScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { pickFromLibrary } = useImagePicker();
  const { data: portfolio = [] } = usePortfolio();
  const { data: services = [] } = useMenu();
  const post = usePostLook();

  const [photoUri, setPhotoUri] = useState<string>();
  const [serviceId, setServiceId] = useState<string>();
  const [caption, setCaption] = useState('');

  const choose = (uri: string, taggedWith?: string) => {
    setPhotoUri(uri);
    // A portfolio photo already knows what it is; don't make her say it twice.
    if (taggedWith) setServiceId(taggedWith);
  };

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
    if (!photoUri) return;
    try {
      await post.mutateAsync({ photoUri, serviceId, caption: caption.trim() || undefined });
      haptics.success();
      router.back();
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
            Pick a photo of work you did. Clients see it with your name on it.
          </Text>
        )}

        {portfolio.length > 0 && (
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

        {services.length > 0 && (
          <View style={styles.group}>
            <Text variant="footnote" tone="secondary">
              What is it? Tagging it shows your price under the photo.
            </Text>
            <View style={styles.chips}>
              {services.map(service => (
                <Chip
                  key={service.id}
                  label={`${service.name} · ${formatPrice(service)}`}
                  selected={serviceId === service.id}
                  onPress={() => setServiceId(serviceId === service.id ? undefined : service.id)}
                />
              ))}
            </View>
          </View>
        )}

        <Input
          label="Say something about it"
          value={caption}
          onChangeText={setCaption}
          placeholder="Knotless, waist length, done in one sitting."
          multiline
          style={{ minHeight: 88 }}
        />

        <View style={styles.footer}>
          <Button
            label="Post it"
            onPress={share}
            disabled={!photoUri}
            loading={post.isPending}
            fullWidth
            testID="look-post"
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
