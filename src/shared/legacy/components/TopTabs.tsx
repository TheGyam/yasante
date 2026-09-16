import React, { useRef } from 'react';
import { TouchableOpacity, View, LayoutChangeEvent } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { Text } from '@/shared/legacy/ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

const TabsContainer = styled.View`
  flex-direction: row;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  position: relative;
`;

const TabButton = styled(TouchableOpacity)`
  flex: 1;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const Indicator = styled(Animated.View)`
  position: absolute;
  bottom: 0;
  height: 2px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  border-radius: 1px;
`;

export interface TopTab {
  id: string;
  label: string;
}

export interface TopTabsProps {
  tabs: TopTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TopTabs({ tabs, activeTab, onTabChange }: TopTabsProps) {
  const { theme } = useTheme();
  const indicatorPosition = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const tabLayouts = useRef<Array<{ x: number; width: number }>>([]);
  const containerWidth = useRef<number>(0);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    containerWidth.current = event.nativeEvent.layout.width;
    updateIndicator();
  };

  const handleTabLayout = (index: number) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.current[index] = { x, width };
    updateIndicator();
  };

  const updateIndicator = () => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (activeIndex >= 0 && tabLayouts.current[activeIndex] && containerWidth.current > 0) {
      const tabLayout = tabLayouts.current[activeIndex];
      // Calculate position and width in pixels relative to container
      indicatorPosition.value = withTiming(tabLayout.x, { duration: 200 });
      indicatorWidth.value = withTiming(tabLayout.width, { duration: 200 });
    }
  };

  React.useEffect(() => {
    updateIndicator();
  }, [activeTab, tabs]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicatorPosition.value,
    width: indicatorWidth.value,
  }));

  return (
    <TabsContainer onLayout={handleContainerLayout}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <TabButton
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            onLayout={handleTabLayout(index)}
            activeOpacity={0.7}
          >
            <Text
              variant="body"
              weight={isActive ? 'semibold' : 'regular'}
              color={isActive ? theme.colors.primary : theme.colors.text.medium}
            >
              {tab.label}
            </Text>
          </TabButton>
        );
      })}
      <Indicator style={indicatorStyle} />
    </TabsContainer>
  );
}
