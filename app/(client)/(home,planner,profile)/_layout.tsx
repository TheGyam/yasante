import { Stack } from 'expo-router';
import { useStackPresets } from '@/shared/ui/stackOptions';
import { TabStack, singularById } from '@/shared/ui/TabStack';

// Content, boards and the library open inside whichever tab you're in, so going
// deeper never throws you into another tab. The router prefers the current tab's
// copy of a shared route, so links stay plain paths like `/content/123`.

export const unstable_settings = {
  initialRouteName: 'home',
  home: { initialRouteName: 'home' },
  planner: { initialRouteName: 'planner' },
  profile: { initialRouteName: 'profile' },
};

const ROOTS: Record<string, string> = {
  '(home)': 'home',
  '(planner)': 'planner',
  '(profile)': 'profile',
};

export default function ClientTabStack({ segment }: { segment: string }) {
  const { fade } = useStackPresets();
  return (
    <TabStack root={ROOTS[segment]}>
      <Stack.Screen name="content/[id]" dangerouslySingular={singularById} />
      <Stack.Screen name="board/[id]" dangerouslySingular={singularById} />
      {/* Search grows out of its field rather than sliding in as a new page. */}
      {segment === '(home)' && <Stack.Screen name="search" options={fade} />}
    </TabStack>
  );
}
