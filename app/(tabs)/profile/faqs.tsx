import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { TopBar } from '@/components/composed/TopBar';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const FAQCard = styled(Card)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding: 0;
  overflow: hidden;
`;

const FAQHeader = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const FAQQuestion = styled.View`
  flex: 1;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const FAQAnswer = styled.View<{ isOpen: boolean }>`
  max-height: ${({ isOpen }: { isOpen: boolean }) => (isOpen ? '1000px' : '0px')};
  overflow: hidden;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ isOpen, theme }: { isOpen: boolean; theme: Theme }) => (isOpen ? theme.spacing[4] : 0)}px;
`;

const faqs = [
  {
    id: '1',
    question: 'How do I track my hair growth progress?',
    answer: 'You can track your hair growth by creating goals in the Planner tab. Add progress photos regularly to see your hair transformation over time. The app will help you visualize your growth journey.',
  },
  {
    id: '2',
    question: 'Can I save my favorite hairstyles and tutorials?',
    answer: 'Yes! You can favorite any content by tapping the heart icon on inspiration posts, DIY tutorials, or educational articles. All your favorites are organized in the Profile tab under Favorites.',
  },
  {
    id: '3',
    question: 'How do I update my hair profile?',
    answer: 'Go to Profile > Settings > Hair Profile to view and edit your hair profile. You can also retake the hair profile quiz from the Profile tab to update your information.',
  },
  {
    id: '4',
    question: 'What types of content are available?',
    answer: 'The app offers three main types of content: Inspiration posts for hairstyle ideas, DIY tutorials with step-by-step instructions, and Educational articles about hair care, styling, and health.',
  },
  {
    id: '5',
    question: 'How do I add a monthly hairstyle to my planner?',
    answer: 'In the Planner tab, tap on any month card and then tap the image area or use the action buttons to add a hairstyle photo. You can add photos, notes, and set goals for each month.',
  },
  {
    id: '6',
    question: 'Is my data private and secure?',
    answer: 'Yes, we take your privacy seriously. All your data is stored securely and is only accessible to you. You can manage your privacy settings in Profile > Privacy Settings.',
  },
];

export default function FAQsScreen() {
  const { theme } = useTheme();
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <Container testID="faqs-screen">
      <TopBar title="FAQs" />
      <Content>
        {faqs.map((faq) => {
          const isOpen = openFAQ === faq.id;
          return (
            <FAQCard key={faq.id}>
              <FAQHeader onPress={() => toggleFAQ(faq.id)} activeOpacity={0.7}>
                <FAQQuestion>
                  <Text variant="body" weight="semibold" color={theme.colors.text.high}>
                    {faq.question}
                  </Text>
                </FAQQuestion>
                {isOpen ? (
                  <ChevronUp size={20} color={theme.colors.text.medium} />
                ) : (
                  <ChevronDown size={20} color={theme.colors.text.medium} />
                )}
              </FAQHeader>
              <FAQAnswer isOpen={isOpen}>
                <Text variant="body" color={theme.colors.text.medium}>
                  {faq.answer}
                </Text>
              </FAQAnswer>
            </FAQCard>
          );
        })}
      </Content>
    </Container>
  );
}

