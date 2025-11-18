import React from 'react';
import { View, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { responsive } from '@/utils/responsive';

interface TabItem {
  name: string;
  route: string;
  icon: string;
  label: string;
}

const tabs: TabItem[] = [
  { name: 'planner', route: '/(tabs)/planner', icon: '📅', label: 'Planner' },
  { name: 'education', route: '/(tabs)/education', icon: '📚', label: 'Learn' },
  { name: 'profile', route: '/(tabs)/profile', icon: '👤', label: 'Profile' },
];

interface CustomTabBarProps {
  // Accept props from Expo Router but we'll use our own navigation logic
  [key: string]: any;
}

export const CustomTabBar: React.FC<CustomTabBarProps> = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const tabWidth = screenWidth / tabs.length;
  
  if (__DEV__) {
    console.log('CustomTabBar rendered, pathname:', pathname);
  }

  const getActiveIndex = () => {
    const index = tabs.findIndex((tab) => pathname?.startsWith(tab.route));
    return index >= 0 ? index : 0;
  };

  const activeIndex = getActiveIndex();

  const handleTabPress = (tab: TabItem) => {
    router.push(tab.route as any);
  };

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingBottom: insets.bottom,
        height: 70 + insets.bottom,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          height: 70,
          position: 'relative',
        }}
      >
        {/* Static Indicator */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: activeIndex * tabWidth,
            width: tabWidth,
            height: 3,
            backgroundColor: theme.colors.primary,
            borderRadius: 2,
          }}
        />

        {tabs.map((tab, index) => {
          const isActive = activeIndex === index;
          
          if (__DEV__ && index === 0) {
            console.log('CustomTabBar rendering tabs, activeIndex:', activeIndex);
          }

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: theme.spacing[2],
              }}
              activeOpacity={0.7}
              disabled={false}
            >
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: isActive ? 1.1 : 1 }],
                }}
              >
                <Text
                  style={{
                    fontSize: responsive.fontScale(24),
                    marginBottom: theme.spacing[1],
                  }}
                >
                  {tab.icon}
                </Text>
                <Text
                  style={{
                    fontSize: responsive.fontScale(theme.typography.fontSize.xs),
                    fontFamily: theme.typography.fontFamily.medium,
                    fontWeight: isActive
                      ? theme.typography.fontWeight.semiBold
                      : theme.typography.fontWeight.regular,
                    color: isActive
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

