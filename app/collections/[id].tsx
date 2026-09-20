import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Images, Trash2, X } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import {
  useCollectionItems,
  useCollections,
  useDeleteCollection,
  useRemoveFromCollection,
  useUpdateCollection,
} from '@/features/planner';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { confirm, notify } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { Input } from '@/shared/ui/Input';
import { ListRow } from '@/shared/ui/ListRow';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { Toggle } from '@/shared/ui/Toggle';

const useStyles = makeStyles(t => ({
  body: { gap: space.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '31%' },
  photo: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radius.sm,
    backgroundColor: t.colors.glass.fillStrong,
  },
  drop: { position: 'absolute', top: space.xs, right: space.xs },
  caption: { marginTop: 4 },
}));

/** One collection: what's in it, what it's called, and who can see it. */
export default function CollectionScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: collections } = useCollections();
  const collection = collections?.find(item => item.id === id);
  const { data: items, isLoading } = useCollectionItems(id);

  const [name, setName] = useState('');
  const update = useUpdateCollection();
  const removeItem = useRemoveFromCollection(id);
  const remove = useDeleteCollection();

  useEffect(() => {
    if (collection) setName(collection.name);
  }, [collection]);

  const rename = () => {
    const next = name.trim();
    if (!next || next === collection?.name) return;
    update.mutate({ id, name: next });
  };

  const confirmDelete = async () => {
    const yes = await confirm({
      title: `Delete ${collection?.name ?? 'this collection'}?`,
      message: 'The looks and articles in it stay saved elsewhere — only the set goes.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!yes) return;
    try {
      await remove.mutateAsync(id);
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t delete it',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title={collection?.name ?? 'Collection'} back keyboard testID="collection-screen">
      <View style={styles.body}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          onBlur={rename}
          onSubmitEditing={rename}
          returnKeyType="done"
          autoCapitalize="sentences"
        />

        <Section footer="Private collections are yours alone.">
          <ListRow
            title="Keep it private"
            trailing={
              <Toggle
                value={collection?.isPrivate ?? true}
                onValueChange={isPrivate => update.mutate({ id, isPrivate })}
                accessibilityLabel="Keep it private"
              />
            }
          />
        </Section>

        {isLoading ? (
          <Skeleton height={160} />
        ) : items?.length ? (
          <View style={styles.grid}>
            {items.map((item, index) => (
              <View key={item.id} style={styles.tile}>
                <View>
                  <View style={styles.photo}>
                    {!!item.imageUri && (
                      <RemoteImage
                        uri={item.imageUri}
                        style={StyleSheet.absoluteFill}
                        recyclingKey={item.id}
                      />
                    )}
                  </View>
                  <IconButton
                    icon={X}
                    variant="overlay"
                    size={28}
                    style={styles.drop}
                    accessibilityLabel={`Remove item ${index + 1}`}
                    onPress={() => removeItem.mutate(item.id)}
                  />
                </View>
                {!!item.title && (
                  <Text variant="caption" tone="tertiary" numberOfLines={2} style={styles.caption}>
                    {item.title}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={Images}
            title="Nothing in here yet"
            message="Save a look from the feed and choose this collection."
          />
        )}

        <Button
          label="Delete collection"
          icon={Trash2}
          variant="danger"
          onPress={confirmDelete}
          loading={remove.isPending}
          fullWidth
        />
      </View>
    </Screen>
  );
}
