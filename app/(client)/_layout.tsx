import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CalendarHeart, CircleUserRound, House } from 'lucide-react-native';
import { useModeStore } from '@/features/stylist';
import { TabBar, type TabItem } from '@/shared/ui/TabBar';

const TABS: readonly TabItem[] = [
  { name: '(home)', label: 'Home', icon: House },
  { name: '(planner)', label: 'Planner', icon: CalendarHeart },
  { name: '(profile)', label: 'Profile', icon: CircleUserRound },
];

const SCREEN_OPTIONS = {
  headerShown: false,
  // Tabs are peers: switching never slides.
  animation: 'none',
  sceneStyle: { backgroundColor: 'transparent' },
} as const;

// Module-level, so the navigator gets the same function every render.
// Arriving through a mode switch, the bar rises in as the switch card lifts away.
const renderTabBar = (props: BottomTabBarProps) => (
  <TabBar
    {...props}
    items={TABS}
    enterAfter={useModeStore.getState().switchingTo ? 260 : undefined}
  />
);

export default function TabsLayout() {
  return <Tabs tabBar={renderTabBar} screenOptions={SCREEN_OPTIONS} />;
}
