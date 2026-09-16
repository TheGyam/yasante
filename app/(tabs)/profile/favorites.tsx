import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Play, BookOpen, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { useFavorites, useContent, useToggleFavorite, useIsFavorite } from '@/features/education';
import { useAuth } from '@/features/auth';
import { Text } from '@/shared/legacy/ui/Text';
import { ImageWithPlaceholder } from '@/shared/legacy/ui/ImageWithPlaceholder';
import { formatRelativeTime } from '@/shared/utils/date';

const tabs = [
  { id: 'inspiration', label: 'Inspiration', icon: <ImageIcon size={14} /> },
  { id: 'diy', label: 'DIY', icon: <Play size={14} /> },
  { id: 'education', label: 'Education', icon: <BookOpen size={14} /> },
];

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user: authUser, isAuthenticated } = useAuth();
  const { data: favorites, isLoading: isLoadingFavs } = useFavorites(authUser?.id || '', {
    enabled: !!authUser?.id && isAuthenticated,
  });
  const { data: allContent, isLoading: isLoadingContent } = useContent();
  const [activeTab, setActiveTab] = useState<'inspiration' | 'diy' | 'education'>('inspiration');

  const itemWidth = (width - 52) / 2;

  const favoritesList = useMemo(() => {
    if (!favorites || !allContent?.data) return [];
    const contentArray = Array.isArray(allContent.data) ? allContent.data : [];
    return favorites
      .map(fav => contentArray.find(c => c.id === fav.contentId))
      .filter((content): content is NonNullable<typeof content> => content !== undefined);
  }, [favorites, allContent]);

  const categorizedFavorites = useMemo(() => {
    const inspiration = favoritesList.filter(
      item => item.topic === 'styling' || item.topic === 'tips'
    );
    const education = favoritesList.filter(
      item => item.topic !== 'styling' && item.topic !== 'tips'
    );
    const diy: any[] = []; // DIYs might need separate filtering logic if they have specific types
    return { inspiration, diy, education };
  }, [favoritesList]);

  if (isLoadingFavs || isLoadingContent) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const renderContent = () => {
    const data = categorizedFavorites[activeTab as keyof typeof categorizedFavorites];
    if (data.length === 0) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 100 }}>
          <View
            style={{
              width: 80,
              height: 80,
              backgroundColor: theme.colors.surface,
              borderWidth: 3,
              borderColor: theme.colors.text.high,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              transform: [{ rotate: '-5deg' }],
            }}
          >
            <Heart size={40} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <Text
            variant="h3"
            weight="bold"
            color={theme.colors.text.high}
            style={{ textTransform: 'uppercase', fontStyle: 'italic' }}
          >
            Nothing here yet
          </Text>
          <Text
            variant="caption"
            color={theme.colors.text.medium}
            style={{ marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 }}
          >
            Favorite some {activeTab} content!
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {data.map(item => (
          <CompactBrutalistCard
            key={item.id}
            content={item}
            width={itemWidth}
            theme={theme}
            onPress={() =>
              router.push(
                `/(tabs)/${activeTab === 'inspiration' ? 'home' : activeTab}/${item.id}` as any
              )
            }
          />
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="favorites-screen">
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.background,
          borderBottomWidth: 4,
          borderBottomColor: theme.colors.border,
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 2,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color={theme.colors.text.high} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text
            variant="h3"
            weight="bold"
            color={theme.colors.text.high}
            style={{ fontSize: 20, textTransform: 'uppercase', fontStyle: 'italic' }}
          >
            Favorites
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Switcher */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, marginBottom: 24 }}
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: isActive ? theme.colors.accent : theme.colors.surface,
                  borderWidth: 3,
                  borderColor: theme.colors.text.high,
                  borderRadius: 12,
                  shadowColor: theme.colors.text.high,
                  shadowOffset: isActive ? { width: 0, height: 0 } : { width: 4, height: 4 },
                  shadowOpacity: isActive ? 0 : 1,
                  shadowRadius: 0,
                  elevation: isActive ? 0 : 4,
                  transform: isActive ? [{ translateX: 2 }, { translateY: 2 }] : [],
                }}
              >
                {React.cloneElement(tab.icon as any, {
                  color: theme.colors.text.high,
                  strokeWidth: 2.5,
                })}
                <Text
                  variant="caption"
                  weight="bold"
                  color={theme.colors.text.high}
                  style={{ textTransform: 'uppercase' }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {renderContent()}
      </ScrollView>
    </View>
  );
}

function CompactBrutalistCard({ content, width, theme, onPress }: any) {
  const { user } = useAuth();
  const userId = user?.id || '';
  const { data: isFavorite = false } = useIsFavorite(userId, content.id, { enabled: !!userId });
  const toggleFavorite = useToggleFavorite(userId);

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    toggleFavorite.mutate(content.id);
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ width, marginBottom: 20 }}>
      <View style={{ position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            right: -4,
            bottom: -4,
            backgroundColor: theme.colors.primary,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: theme.colors.text.high,
          }}
        />
        <View
          style={{
            height: 160,
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: theme.colors.text.high,
            overflow: 'hidden',
          }}
        >
          {content.thumbnailUri && (
            <ImageWithPlaceholder
              source={{ uri: content.thumbnailUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )}
          <TouchableOpacity
            onPress={handleFavoritePress}
            activeOpacity={0.7}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              borderWidth: 2,
              borderColor: theme.colors.text.high,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart
              size={14}
              color={isFavorite ? theme.colors.primary : theme.colors.text.low}
              fill={isFavorite ? theme.colors.primary : 'transparent'}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ marginTop: 12 }}>
        <Text
          variant="caption"
          weight="bold"
          color={theme.colors.text.high}
          numberOfLines={2}
          style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          {content.title}
        </Text>
        <Text
          variant="caption"
          color={theme.colors.primary}
          style={{ marginTop: 4, fontSize: 10, fontWeight: '700' }}
        >
          {formatRelativeTime(content.publishedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
