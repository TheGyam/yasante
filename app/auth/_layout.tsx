import { Stack } from 'expo-router';
import { useStackPresets } from '@/shared/ui/stackOptions';

// Presented as one modal. Joining, signing in and signing up replace each other with
// a crossfade, so switching back and forth never builds a history; the steps inside
// a flow (details, phone, recovery) push.
export default function AuthStackLayout() {
  const { push, fade } = useStackPresets();
  return (
    <Stack screenOptions={push}>
      <Stack.Screen name="join" options={fade} />
      <Stack.Screen name="login" options={fade} />
      <Stack.Screen name="signup" />
      {/* Nothing to go back to once the account exists. */}
      <Stack.Screen name="verify-email" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
