import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { Search, Bookmark, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { Input } from '@/shared/ui/Input';
import { Avatar } from '@/shared/ui/Avatar';
import { QuickCategoryCard } from './QuickCategoryCard';
import type { Theme } from '@/shared/theme/ThemeProvider';

const HeaderContainer = styled.View<{ topInset: number }>`
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  padding-top: ${({ topInset, theme }: { topInset: number; theme: Theme }) =>
    topInset + theme.spacing[2]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const TopRow = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  min-height: 44px;
`;

const SearchInputContainer = styled.View`
  flex: 1;
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const IconButton = styled(TouchableOpacity)`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const QuickCategoriesContainer = styled.ScrollView.attrs({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 16,
  },
})``;

export interface EducationHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBookmarkPress?: () => void;
  onNotificationPress?: () => void;
  quickCategories?: Array<{ icon: React.ReactNode; label: string; onPress?: () => void }>;
}

export function EducationHeader({
  searchQuery,
  onSearchChange,
  onBookmarkPress,
  onNotificationPress,
  quickCategories = [],
}: EducationHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <HeaderContainer topInset={insets.top}>
      <TopRow>
        <Avatar size={32} name="K" />
        <SearchInputContainer>
          <View style={{ flex: 1, marginBottom: -theme.spacing[3] }}>
            <Input
              placeholder="Search"
              value={searchQuery}
              onChangeText={onSearchChange}
              leftIcon={<Search size={18} color={theme.colors.text.low} />}
              clearable
            />
          </View>
        </SearchInputContainer>
        <IconButton onPress={onBookmarkPress} activeOpacity={0.7}>
          <Bookmark size={24} color={theme.colors.text.medium} strokeWidth={2.5} />
        </IconButton>
        <IconButton onPress={onNotificationPress} activeOpacity={0.7}>
          <Bell size={24} color={theme.colors.text.medium} strokeWidth={2.5} />
        </IconButton>
      </TopRow>

      {quickCategories.length > 0 && (
        <QuickCategoriesContainer>
          {quickCategories.map((category, index) => (
            <QuickCategoryCard
              key={index}
              icon={category.icon}
              label={category.label}
              onPress={category.onPress}
            />
          ))}
        </QuickCategoriesContainer>
      )}
    </HeaderContainer>
  );
}
