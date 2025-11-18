import React from 'react';
import { Home, Calendar, BookOpen, User } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

export type TabIconName = 'home' | 'planner' | 'education' | 'profile';

export interface TabIconProps {
  name: TabIconName;
  size?: number;
  active?: boolean;
  accessibilityLabel?: string;
}

const iconMap = {
  home: Home,
  planner: Calendar,
  education: BookOpen,
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

