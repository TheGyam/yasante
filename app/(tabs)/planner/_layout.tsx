import { Stack } from 'expo-router';
import { useStackOptions } from '@/shared/ui/stackOptions';

export default function PlannerLayout() {
  const screenOptions = useStackOptions();
  return (
    <Stack
      screenOptions={screenOptions}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="goal/[id]" />
      <Stack.Screen name="hairstyle/[month]" />
      <Stack.Screen name="hairstyle/edit/[id]" />
      <Stack.Screen name="moodboard/[id]" />
      <Stack.Screen name="moodboard/create" />
      <Stack.Screen name="moodboard/edit/[id]" />
    </Stack>
  );
}
