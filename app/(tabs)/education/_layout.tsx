import { Stack } from 'expo-router';
import { useStackOptions } from '@/shared/ui/stackOptions';

export default function EducationLayout() {
  const screenOptions = useStackOptions();
  return (
    <Stack
      screenOptions={screenOptions}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="diy/[id]"
        options={{
          animation: 'fade',
          presentation: 'transparentModal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
