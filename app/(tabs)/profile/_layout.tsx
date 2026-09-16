import { Stack } from 'expo-router';
import { useStackOptions } from '@/shared/ui/stackOptions';

export default function ProfileLayout() {
  const screenOptions = useStackOptions();
  return (
    <Stack
      screenOptions={screenOptions}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="report" />
      <Stack.Screen name="faqs" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}
