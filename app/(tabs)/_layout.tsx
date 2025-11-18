import { Tabs } from 'expo-router';
import { BottomTabBar } from '@/components/composed/BottomTabBar';
import { View } from 'react-native';
import { usePathname } from 'expo-router';

export default function TabsLayout() {
  const pathname = usePathname();
  // Check for DIY story screen - handle different pathname formats
  const isModalScreen = pathname?.includes('diy/') || pathname?.includes('/diy/');

  return (
    <Tabs
      tabBar={(props) => isModalScreen ? <View style={{ width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} /> : <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          href: '/(tabs)/planner',
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: 'Education',
          href: '/(tabs)/education',
        }}
      />
      <Tabs.Screen
        name="education/diy/[id]"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

