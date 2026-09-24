import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from '@/shared/lib/navigation';
import { useAppeal } from '@/features/looks';
import { haptics } from '@/shared/lib/haptics';
import { errorMessage } from '@/features/auth';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
}));

/** One appeal against something done to her post: why it should come back. */
export default function AppealScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id, what, reason } = useLocalSearchParams<{
    id: string;
    what: string;
    reason?: string;
  }>();
  const [body, setBody] = useState('');
  const appeal = useAppeal();

  const send = async () => {
    try {
      await appeal.mutateAsync({ id, body: body.trim() });
      haptics.success();
      router.back();
      await notify({
        title: 'Appeal sent',
        message: 'A person will look at it. You’ll see the answer under Reports and appeals.',
      });
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t send that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen title="Appeal" modal keyboard testID="appeal-screen">
      <View style={styles.body}>
        <View>
          <Text variant="bodyStrong">{what}</Text>
          {!!reason && <Text tone="secondary">{reason}</Text>}
        </View>
        <Input
          label="Why should it come back?"
          value={body}
          onChangeText={setBody}
          placeholder="For example: it’s my own work, here’s where I posted it first"
          multiline
          maxLength={1000}
          style={{ minHeight: 120 }}
        />
        <Text variant="footnote" tone="tertiary">
          You can appeal once. Be specific; it’s the only thing we’ll read.
        </Text>
        <Button
          label="Send appeal"
          onPress={send}
          disabled={!body.trim()}
          loading={appeal.isPending}
          fullWidth
        />
      </View>
    </Screen>
  );
}
