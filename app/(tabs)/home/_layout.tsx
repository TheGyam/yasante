import { Stack } from 'expo-router';
import { useStackOptions } from '@/shared/ui/stackOptions';

export default function HomeLayout() {
  const screenOptions = useStackOptions();
  return (
    <Stack
      screenOptions={screenOptions}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
