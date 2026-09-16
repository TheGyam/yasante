import React from 'react';
import { Home, Calendar, User } from 'lucide-react-native';
import { useTheme } from '@/shared/hooks/useTheme';

export type TabIconName = 'home' | 'planner' | 'profile';

export interface TabIconProps {
  name: TabIconName;
  size?: number;
  active?: boolean;
  accessibilityLabel?: string;
}

const iconMap = {
  home: Home,
  planner: Calendar,
  profile: User,
};

export function TabIcon({ name, size = 22, active = false, accessibilityLabel }: TabIconProps) {
  const { theme } = useTheme();
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    return null;
  }

  const strokeColor = active ? theme.colors.primary : theme.colors.text.low;
  const strokeWidth = active ? 2.5 : 2.0;
  const iconSize = active ? size + 2 : size;

  return (
    <IconComponent
      size={iconSize}
      color={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

