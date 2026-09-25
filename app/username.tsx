import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AtSign } from 'lucide-react-native';
import { errorMessage, useAuth } from '@/features/auth';
import { useUpdateUser, useUsernameField } from '@/features/profile';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { Screen } from '@/shared/ui/Screen';

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
  footer: { paddingTop: space.lg },
}));

/**
 * Asked before a first post or comment: what's shown on them is the username, so
 * there has to be one. `then` is where she was going; without it she goes back to
 * what she was writing.
 */
export default function UsernameScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { then } = useLocalSearchParams<{ then?: string }>();
  const { user } = useAuth();
  const update = useUpdateUser(user?.id);
  const field = useUsernameField();

  const save = async () => {
    try {
      await update.mutateAsync({ username: field.wanted });
      haptics.success();
      if (then) router.replace(then as never);
      else router.back();
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t save that',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen
      title="Pick a username"
      subtitle="It’s the name on your looks and comments. You can change it later in your profile."
      modal
      keyboard
      testID="username-screen"
    >
      <View style={styles.body}>
        <Input
          label="Username"
          icon={AtSign}
          value={field.username}
          onChangeText={field.setUsername}
          hint={field.taken ? undefined : field.hint}
          error={field.taken ? field.hint : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          maxLength={31}
          onSubmitEditing={() => !field.tooShort && !field.taken && save()}
          testID="username-input"
        />
        <View style={styles.footer}>
          <Button
            label="Save and continue"
            onPress={save}
            disabled={field.tooShort || field.taken}
            loading={update.isPending}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}
