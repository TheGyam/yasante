import { View } from 'react-native';
import { Camera, ImagePlus } from 'lucide-react-native';
import { useImagePicker } from '@/shared/hooks/useImagePicker';
import { makeStyles, space } from '@/shared/theme';
import { notify } from './dialog';
import { ListRow } from './ListRow';
import { Section } from './Section';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface PhotoSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onPick: (uri: string) => void;
  title?: string;
  /** Crop it square first: a profile photo, shown in a circle. */
  square?: boolean;
}

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
}));

/**
 * Library or camera. Hands back a compressed local URI, which is uploaded before it's
 * saved: the server takes only a person's own uploads, never a link.
 */
export function PhotoSourceSheet({
  visible,
  onClose,
  onPick,
  title = 'Add a photo',
  square,
}: PhotoSourceSheetProps) {
  const styles = useStyles();
  const { pickFromLibrary, takePicture } = useImagePicker();

  const pick = async (source: () => Promise<string | null>) => {
    try {
      const uri = await source();
      if (uri) onPick(uri);
    } catch {
      notify({ title: 'No access', message: 'Allow access in Settings to add your own pictures.' });
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text variant="title3">{title}</Text>
        <Section>
          <ListRow
            title="Choose from library"
            icon={ImagePlus}
            onPress={() => pick(() => pickFromLibrary(true, square))}
          />
          <ListRow
            title="Take a photo"
            icon={Camera}
            onPress={() => pick(() => takePicture(true, square))}
          />
        </Section>
      </View>
    </Sheet>
  );
}
