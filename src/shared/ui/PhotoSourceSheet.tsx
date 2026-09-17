import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Camera, ImagePlus, Link2 } from 'lucide-react-native';
import { useImagePicker } from '@/shared/hooks/useImagePicker';
import { makeStyles, space } from '@/shared/theme';
import { Button } from './Button';
import { Input } from './Input';
import { ListRow } from './ListRow';
import { Section } from './Section';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface PhotoSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onPick: (uri: string) => void;
  title?: string;
  /** Also accept a pasted image link. */
  allowLink?: boolean;
}

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
}));

/** Library, camera or — optionally — a link. Hands back a compressed local URI or the link. */
export function PhotoSourceSheet({
  visible,
  onClose,
  onPick,
  title = 'Add a photo',
  allowLink,
}: PhotoSourceSheetProps) {
  const styles = useStyles();
  const { pickFromLibrary, takePicture } = useImagePicker();
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string>();

  const pick = async (source: () => Promise<string | null>) => {
    try {
      const uri = await source();
      if (uri) onPick(uri);
    } catch {
      Alert.alert('No access', 'Allow access in Settings to add your own pictures.');
    }
  };

  const addLink = () => {
    const url = link.trim();
    if (!/^https?:\/\/\S+$/.test(url)) {
      setLinkError('Paste a full link, starting with https://');
      return;
    }
    setLink('');
    onPick(url);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text variant="title3">{title}</Text>
        <Section>
          <ListRow
            title="Choose from library"
            icon={ImagePlus}
            onPress={() => pick(pickFromLibrary)}
          />
          <ListRow title="Take a photo" icon={Camera} onPress={() => pick(takePicture)} />
        </Section>
        {allowLink && (
          <>
            <Input
              label="Or paste an image link"
              placeholder="https://"
              icon={Link2}
              value={link}
              onChangeText={text => {
                setLink(text);
                if (linkError) setLinkError(undefined);
              }}
              error={linkError}
              autoCapitalize="none"
              keyboardType="url"
              onSubmitEditing={addLink}
            />
            <Button
              label="Add link"
              variant="secondary"
              onPress={addLink}
              disabled={!link.trim()}
              fullWidth
            />
          </>
        )}
      </View>
    </Sheet>
  );
}
