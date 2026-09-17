import { Stack } from 'expo-router';
import { useStackPresets } from '@/shared/ui/stackOptions';

// Content, boards and the library open inside whichever tab you're in, so going
// deeper never throws you into another tab. The router prefers the current tab's
// copy of a shared route, so links stay plain paths like `/content/123`.

// Anchors: a tab's root sits under anything opened by a link, so back always has a home.
export const unstable_settings = {
  initialRouteName: 'home',
  home: { initialRouteName: 'home' },
  planner: { initialRouteName: 'planner' },
  profile: { initialRouteName: 'profile' },
};

// Tabs build their stack from the first declared screen, and all three share this
// layout — so each declares its own root first.
const ROOTS: Record<string, string> = {
  '(home)': 'home',
  '(planner)': 'planner',
  '(profile)': 'profile',
};

// One screen per id: opening something already in the history goes back to it
// instead of stacking a duplicate (A → B → A → B…).
const byId = ({ params }: { params?: Record<string, unknown> }) =>
  typeof params?.id === 'string' ? params.id : undefined;

export default function TabStackLayout({ segment }: { segment: string }) {
  const { push, fade } = useStackPresets();
  return (
    <Stack screenOptions={push}>
      <Stack.Screen name={ROOTS[segment]} />
      <Stack.Screen name="content/[id]" getId={byId} />
      <Stack.Screen name="board/[id]" getId={byId} />
      {/* Search grows out of its field rather than sliding in as a new page. */}
      {segment === '(home)' && <Stack.Screen name="search" options={fade} />}
    </Stack>
  );
}
