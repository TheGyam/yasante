import { ActivityIndicator, Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { haptics } from '@/shared/lib/haptics';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { ListRow } from '@/shared/ui/ListRow';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Section } from '@/shared/ui/Section';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';
import { useAddPhotoToMoodBoardEntry, useMoodBoardEntries } from '../hooks/useMoodBoard';
import type { MoodBoardEntry } from '../types';

export interface SaveToBoardSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The picture being saved, and a name to suggest for a new board. */
  imageUri?: string;
  title: string;
}

const useStyles = makeStyles(t => ({
  body: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  thumb: {
    width: 48,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: t.colors.glass.fillStrong,
  },
  text: { flex: 1 },
  list: { gap: space.xs },
}));

const photoCount = (entry: MoodBoardEntry) => {
  const n = entry.photos?.length ?? 0;
  return n === 1 ? '1 photo' : `${n} photos`;
};

/** Save a picture to one of your boards, or start a new board with it. */
export function SaveToBoardSheet({ visible, onClose, imageUri, title }: SaveToBoardSheetProps) {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data: boards = [], isLoading } = useMoodBoardEntries(user?.id, undefined, {
    enabled: visible,
  });
  const addPhoto = useAddPhotoToMoodBoardEntry(user?.id);

  const save = (entry: MoodBoardEntry) => {
    if (!imageUri || addPhoto.isPending) return;
    addPhoto.mutate(
      { entry, photoUri: imageUri },
      {
        onSuccess: () => {
          haptics.success();
          onClose();
        },
        onError: () => Alert.alert('Couldn’t save', 'Check your connection and try again.'),
      }
    );
  };

  const startBoard = () => {
    onClose();
    router.push({
      pathname: '/(tabs)/planner/moodboard/create',
      params: { name: title, photo: imageUri ?? '' },
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text variant="title3">Save to a board</Text>
        <Section>
          <ListRow
            title="New board"
            subtitle="Start planning this look"
            icon={Plus}
            onPress={startBoard}
          />
        </Section>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : (
          <View style={styles.list}>
            {boards.slice(0, 6).map(entry => (
              <PressableScale
                key={entry.id}
                onPress={() => save(entry)}
                scaleTo={0.98}
                accessibilityLabel={`Save to ${entry.name}`}
                style={styles.row}
              >
                <RemoteImage uri={entry.mainPhotoUri || entry.photos?.[0]} style={styles.thumb} />
                <View style={styles.text}>
                  <Text variant="callout" numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    {photoCount(entry)}
                  </Text>
                </View>
                {addPhoto.isPending && addPhoto.variables?.entry.id === entry.id && (
                  <ActivityIndicator color={theme.colors.accent} />
                )}
              </PressableScale>
            ))}
          </View>
        )}
      </View>
    </Sheet>
  );
}
