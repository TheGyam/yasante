import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, FolderHeart, FolderPlus } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  useAddToCollection,
  useCollections,
  useCreateCollection,
  type CollectionItemKind,
} from '@/features/planner';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { track } from '@/shared/lib/analytics';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
  footer: { gap: space.xs, paddingTop: space.lg },
}));

/**
 * Save a look or an article into a collection. Starting a collection happens here
 * too — being sent somewhere else to make one first is how a save gets abandoned.
 */
export default function SaveToCollectionScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { kind, refId, title, imageUri } = useLocalSearchParams<{
    kind: CollectionItemKind;
    refId: string;
    title?: string;
    imageUri?: string;
  }>();

  const { data: collections, isLoading } = useCollections();
  const add = useAddToCollection();
  const create = useCreateCollection();
  const [newName, setNewName] = useState('');
  const [saved, setSaved] = useState<string>();

  const fail = async (error: unknown) => {
    haptics.error();
    await notify({
      title: 'Couldn’t save it',
      message: errorMessage(error, 'Check your connection and try again.'),
    });
  };

  const saveTo = async (id: string) => {
    if (saved) return;
    try {
      await add.mutateAsync({ id, kind, refId, title, imageUri });
      if (kind === 'look') track('save_look', { lookId: refId });
      haptics.success();
      setSaved(id);
      // The tick has to be seen. Closing in the same breath as setting it meant the
      // screen just vanished and she never learned which collection it went into.
      setTimeout(() => router.back(), 550);
    } catch (error) {
      await fail(error);
    }
  };

  const startAndSave = async () => {
    try {
      const collection = await create.mutateAsync({ name: newName.trim(), isPrivate: true });
      await saveTo(collection.id);
    } catch (error) {
      await fail(error);
    }
  };

  return (
    <Screen title="Save to a collection" modal keyboard testID="collection-save">
      <View style={styles.body}>
        {!!title && (
          <Text variant="subhead" tone="secondary" numberOfLines={2}>
            {title}
          </Text>
        )}

        {isLoading ? (
          <Skeleton height={140} />
        ) : collections?.length ? (
          <Section>
            {collections.map(collection => (
              <ListRow
                key={collection.id}
                title={collection.name}
                subtitle={`${collection.itemCount} ${collection.itemCount === 1 ? 'item' : 'items'}`}
                icon={FolderHeart}
                trailing={
                  saved === collection.id ? (
                    <Check size={18} color={theme.colors.accent} strokeWidth={2.4} />
                  ) : null
                }
                onPress={() => saveTo(collection.id)}
                testID={`save-to-${collection.id}`}
              />
            ))}
          </Section>
        ) : (
          <EmptyState
            icon={FolderHeart}
            title="No collections yet"
            message="Name one below and this goes straight into it."
          />
        )}

        <Input
          label="Or start a new one"
          icon={FolderPlus}
          value={newName}
          onChangeText={setNewName}
          placeholder="Protective styles for winter"
          autoCapitalize="sentences"
          testID="new-collection-name"
        />

        <View style={styles.footer}>
          <Button
            label="Start and save"
            onPress={startAndSave}
            disabled={!newName.trim()}
            loading={create.isPending || add.isPending}
            fullWidth
            testID="start-and-save"
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} fullWidth />
        </View>
      </View>
    </Screen>
  );
}
