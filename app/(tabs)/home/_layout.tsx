import { Stack } from 'expo-router';
import { useStackOptions } from '@/shared/ui/stackOptions';

// Deep links land with the tab's root underneath, so back always has somewhere to go.
export const unstable_settings = { initialRouteName: 'index' };

export default function HomeLayout() {
  return <Stack screenOptions={useStackOptions()} />;
}
