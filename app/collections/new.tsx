import { useState } from 'react';
import { View } from 'react-native';
import { FolderHeart } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import { useCreateCollection } from '@/features/planner';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
  footer: { paddingTop: space.lg },
}));

export default function NewCollectionScreen() {
  const styles = useStyles();
  const router = useRouter();
  const [name, setName] = useState('');
  const create = useCreateCollection();

  const save = async () => {
    try {
      await create.mutateAsync(name.trim());
      haptics.success();
      router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t start that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title="New collection" modal keyboard testID="collection-new">
      <View style={styles.body}>
        <Input
          label="What are you collecting?"
          icon={FolderHeart}
          value={name}
          onChangeText={setName}
          placeholder="Protective styles for winter"
          autoCapitalize="sentences"
        />
        <Text variant="footnote" tone="secondary">
          Only you can see it. You can share it with a link later.
        </Text>
        <View style={styles.footer}>
          <Button
            label="Start collection"
            onPress={save}
            disabled={!name.trim()}
            loading={create.isPending}
            fullWidth
            testID="collection-save"
          />
        </View>
      </View>
    </Screen>
  );
}
