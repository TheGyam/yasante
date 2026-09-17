import { Stack } from 'expo-router';
import { useStackPresets } from '@/shared/ui/stackOptions';
import { TabStack, singularById } from '@/shared/ui/TabStack';

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

export default function ClientTabStack({ segment }: { segment: string }) {
  const { fade } = useStackPresets();
  // An array, not `condition && <Screen/>`: a layout may only ever be handed Screens,
  // and a `false` child makes the router warn and ignore it.
  const screens = [
    <Stack.Screen key="content" name="content/[id]" dangerouslySingular={singularById} />,
    <Stack.Screen key="board" name="board/[id]" dangerouslySingular={singularById} />,
    // Search grows out of its field rather than sliding in as a new page.
    ...(segment === '(home)' ? [<Stack.Screen key="search" name="search" options={fade} />] : []),
  ];

  return <TabStack root={ROOTS[segment]}>{screens}</TabStack>;
}
