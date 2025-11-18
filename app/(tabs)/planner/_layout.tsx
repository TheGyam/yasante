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
    </Stack>
  );
}

