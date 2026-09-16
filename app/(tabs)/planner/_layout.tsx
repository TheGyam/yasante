import { Stack } from 'expo-router';

export default function PlannerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
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
