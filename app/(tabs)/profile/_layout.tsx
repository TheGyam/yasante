import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
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

