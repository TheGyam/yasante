import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CalendarClock, CircleUserRound, Images, Inbox } from 'lucide-react-native';
import { useModeStore } from '@/features/stylist';
import { TabBarProvider } from '@/shared/ui/layout';
import { TabBar, type TabItem } from '@/shared/ui/TabBar';

const TABS: readonly TabItem[] = [
  { name: '(today)', label: 'Today', icon: CalendarClock },
  { name: '(requests)', label: 'Requests', icon: Inbox },
  { name: '(portfolio)', label: 'Portfolio', icon: Images },
  { name: '(account)', label: 'Profile', icon: CircleUserRound },
];

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'none',
  sceneStyle: { backgroundColor: 'transparent' },
} as const;

// Arriving through a mode switch, the bar rises in as the switch card lifts away.
const renderTabBar = (props: BottomTabBarProps) => (
  <TabBar
    {...props}
    items={TABS}
    enterAfter={useModeStore.getState().switchingTo ? 260 : undefined}
  />
);

export default function StylistTabsLayout() {
  return (
    <TabBarProvider>
      <Tabs tabBar={renderTabBar} screenOptions={SCREEN_OPTIONS} />
    </TabBarProvider>
  );
}
