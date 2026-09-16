import React, { useState } from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { Text } from '@/shared/legacy/ui/Text';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const faqs = [
  {
    id: '1',
    question: 'How do I track my hair growth progress?',
    answer:
      'You can track your hair growth by creating goals in the Planner tab. Add progress photos regularly to see your hair transformation over time.',
  },
  {
    id: '2',
    question: 'Can I save my favorite hairstyles?',
    answer:
      'Yes! Tap the heart icon on inspiration posts or tutorials. All your favorites are organized in the Profile tab under Favorites.',
  },
  {
    id: '3',
    question: 'How do I update my hair profile?',
    answer:
      'Go to Settings > Hair Profile to edit your profile or retake the hair quiz from the main Profile page.',
  },
  {
    id: '4',
    question: 'Is my data private and secure?',
    answer:
      'Yes, we take privacy seriously. Your data is stored securely and only accessible to you. Manage your settings in Profile > Privacy.',
  },
  {
    id: '5',
    question: 'How do I add a monthly hairstyle?',
    answer:
      'In the Planner tab, tap on any month card and use the action buttons to add a hairstyle photo and notes.',
  },
];

export default function FAQsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} testID="faqs-screen">
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
            FAQs
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 16, marginTop: 10 }}>
          {faqs.map(faq => {
            const isOpen = openFAQ === faq.id;
            return (
              <View
                key={faq.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: 3,
                  borderColor: theme.colors.text.high,
                  borderRadius: 16,
                  overflow: 'hidden',
                  shadowColor: isOpen ? theme.colors.primary : 'transparent',
                  shadowOffset: { width: 4, height: 4 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: isOpen ? 4 : 0,
                }}
              >
                <TouchableOpacity
                  onPress={() => toggleFAQ(faq.id)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 20,
                    backgroundColor: isOpen ? theme.colors.primary + '10' : theme.colors.surface,
                  }}
                >
                  <Text
                    variant="body"
                    weight="bold"
                    color={theme.colors.text.high}
                    style={{ flex: 1, marginRight: 16, fontSize: 15, textTransform: 'uppercase' }}
                  >
                    {faq.question}
                  </Text>
                  {isOpen ? (
                    <ChevronUp size={20} color={theme.colors.primary} strokeWidth={3} />
                  ) : (
                    <ChevronDown size={20} color={theme.colors.text.low} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>

                {isOpen && (
                  <View
                    style={{
                      paddingHorizontal: 20,
                      paddingBottom: 20,
                      paddingTop: 0,
                      borderTopWidth: 2,
                      borderTopColor: theme.colors.text.high + '20',
                    }}
                  >
                    <Text
                      variant="body"
                      color={theme.colors.text.high}
                      style={{ lineHeight: 22, marginTop: 12 }}
                    >
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
