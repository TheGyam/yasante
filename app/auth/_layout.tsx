import { Stack } from 'expo-router';
import { useStackPresets } from '@/shared/ui/stackOptions';

// Presented as one modal. Sign in and sign up replace each other with a crossfade, so
// switching back and forth never builds a history; recovery screens push.
export default function AuthStackLayout() {
  const { push, fade } = useStackPresets();
  return (
    <Stack screenOptions={push}>
      <Stack.Screen name="login" options={fade} />
      <Stack.Screen name="signup" options={fade} />
    </Stack>
  );
}
