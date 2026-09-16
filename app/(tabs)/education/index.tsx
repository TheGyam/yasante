import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { useContent } from '@/features/education';
import { EducationHeader } from '@/features/education';
import { TopicSection } from '@/features/education';
import { TopTabs } from '@/shared/components/TopTabs';
import { DIYCard, DIY } from '@/features/education';
import { useEducationStore } from '@/features/education';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/shared/ui/Text';
import { AuthPromptModal } from '@/features/auth';
import { 
  Droplets, 
  Scissors, 
  Sparkles, 
  Heart,
  TrendingUp,
  Activity,
  Palette,
  Lightbulb
} from 'lucide-react-native';
import { ContentTopic } from '@/features/education';
import type { Theme } from '@/shared/theme/ThemeProvider';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const ScrollableContent = styled.ScrollView`
  flex: 1;
`;

const ContentWrapper = styled.View`
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

// Topic display names
const topicDisplayNames: Record<ContentTopic, string> = {
  care: 'Hair Care Basics',
  styling: 'Styling & Looks',
  products: 'Product Reviews',
  treatments: 'Treatments & Masks',
  color: 'Color & Highlights',
  growth: 'Hair Growth',
  health: 'Scalp Health',
  tips: 'Pro Tips',
};

// Quick category icons mapping
const quickCategoryIcons = {
  'Hair Type Quiz': <Droplets size={24} color="#8DA399" strokeWidth={2.5} />,
  'Hair Growth': <TrendingUp size={24} color="#8DA399" strokeWidth={2.5} />,
  'Product Guide': <Sparkles size={24} color="#8DA399" strokeWidth={2.5} />,
  'Styling Tips': <Scissors size={24} color="#8DA399" strokeWidth={2.5} />,
  'Hair Health': <Activity size={24} color="#8DA399" strokeWidth={2.5} />,
  'Color Care': <Palette size={24} color="#8DA399" strokeWidth={2.5} />,
  'Daily Tips': <Lightbulb size={24} color="#8DA399" strokeWidth={2.5} />,
  'Favorites': <Heart size={24} color="#8DA399" strokeWidth={2.5} />,
};

export default function ContentLibraryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { searchQuery, setSearchQuery } = useEducationStore();
  const { data: contentResponse, isLoading } = useContent();
  const [activeTab, setActiveTab] = useState<'education' | 'diy'>('education');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const tabs = [
    { id: 'education', label: 'Education' },
    { id: 'diy', label: 'DIY' },
  ];

  const allContent = contentResponse?.data || [];

  // Group content by topic
  const contentByTopic = useMemo(() => {
    const grouped: Partial<Record<ContentTopic, typeof allContent>> = {};
    
    allContent.forEach((item) => {
      if (!grouped[item.topic]) {
        grouped[item.topic] = [];
      }
      grouped[item.topic]!.push(item);
    });

    return grouped;
  }, [allContent]);

  // Filter content by search query
  const filteredContentByTopic = useMemo(() => {
    if (!searchQuery.trim()) {
      return contentByTopic;
    }

    const query = searchQuery.toLowerCase();
    const filtered: Partial<Record<ContentTopic, typeof allContent>> = {};

    Object.entries(contentByTopic).forEach(([topic, items]) => {
      const matching = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.topic.toLowerCase().includes(query)
      );
      if (matching.length > 0) {
        filtered[topic as ContentTopic] = matching;
      }
    });

    return filtered;
  }, [contentByTopic, searchQuery]);

  // Quick categories for header
  const quickCategories = useMemo(
    () => [
      {
        icon: quickCategoryIcons['Hair Type Quiz'],
        label: 'Hair Type Quiz',
        onPress: () => router.push('/onboarding/quiz' as any),
      },
      {
        icon: quickCategoryIcons['Hair Growth'],
        label: 'Hair Growth',
        onPress: () => {
          // Scroll to growth section or filter
          setSearchQuery('growth');
        },
      },
      {
        icon: quickCategoryIcons['Product Guide'],
        label: 'Product Guide',
        onPress: () => {
          setSearchQuery('products');
        },
      },
      {
        icon: quickCategoryIcons['Styling Tips'],
        label: 'Styling Tips',
        onPress: () => {
          setSearchQuery('styling');
        },
      },
    ],
    [router, setSearchQuery]
  );

  const handleContentPress = (contentId: string) => {
    router.push(`/(tabs)/education/${contentId}` as any);
  };

  const handleBookmarkPress = () => {
    // Navigate to favorites or show favorites modal
    router.push('/(tabs)/profile' as any);
  };

  const handleNotificationPress = () => {
    // Show notifications or navigate to notifications screen
    console.log('Notifications pressed');
  };

  // Get all topics in a consistent order
  const topicOrder: ContentTopic[] = [
    'care',
    'growth',
    'styling',
    'treatments',
    'products',
    'health',
    'color',
    'tips',
  ];

  return (
    <Container testID="education-screen">
      <EducationHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onBookmarkPress={handleBookmarkPress}
        onNotificationPress={handleNotificationPress}
        quickCategories={quickCategories}
      />

      <TopTabs tabs={tabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as 'education' | 'diy')} />

      <ScrollableContent
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'education' ? (
          <ContentWrapper>
            {isLoading ? (
              <View style={{ padding: theme.spacing[4] }}>
                <Text>Loading content...</Text>
              </View>
            ) : (
              topicOrder.map((topic) => {
                const content = filteredContentByTopic[topic];
                if (!content || content.length === 0) {
                  return null;
                }
                return (
                  <TopicSection
                    key={topic}
                    title={topicDisplayNames[topic]}
                    content={content}
                    onContentPress={handleContentPress}
                    onFavoritePress={() => setShowAuthPrompt(true)}
                    testID={`topic-section-${topic}`}
                  />
                );
              })
            )}

            {!isLoading && Object.keys(filteredContentByTopic).length === 0 && (
              <View style={{ padding: theme.spacing[4], alignItems: 'center' }}>
                <Text variant="body" color={theme.colors.text.medium}>
                  No content found. Try a different search.
              </Text>
              </View>
            )}
          </ContentWrapper>
        ) : (
          <ContentWrapper>
            <View style={{ padding: theme.spacing[4], alignItems: 'center' }}>
              <Text variant="body" color={theme.colors.text.medium}>
                DIY tutorials coming soon.
              </Text>
            </View>
          </ContentWrapper>
        )}
      </ScrollableContent>
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        feature="favorites"
      />
    </Container>
  );
}
