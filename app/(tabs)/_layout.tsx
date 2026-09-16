import { Tabs } from 'expo-router';
import { CalendarHeart, CircleUserRound, House } from 'lucide-react-native';
import { TabBar, type TabItem } from '@/shared/ui/TabBar';

const TABS: readonly TabItem[] = [
  { name: 'home', label: 'Home', icon: House },
  { name: 'planner', label: 'Planner', icon: CalendarHeart },
  { name: 'profile', label: 'Profile', icon: CircleUserRound },
];

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <TabBar {...props} items={TABS} />}
      screenOptions={{
        headerShown: false,
        // Tabs are peers: switching never slides.
        animation: 'none',
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="planner" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="education" options={{ href: null }} />
    </Tabs>
  );
}
