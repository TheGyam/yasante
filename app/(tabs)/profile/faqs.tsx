import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { haptics } from '@/shared/lib/haptics';
import { makeStyles, space, useTheme } from '@/shared/theme';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';

const FAQS = [
  {
    q: 'What is a board?',
    a: 'A board keeps everything about one look together: inspiration photos, your appointment, the stylist, where it is and what it costs. Create one from the Planner tab, or save any picture from Home straight into a board.',
  },
  {
    q: 'How do I save styles and articles?',
    a: 'Tap the bookmark on any post or article. Everything you save is in Profile, under Saved styles and articles.',
  },
  {
    q: 'How do I change my hair profile?',
    a: 'Tap the Your hair card on your profile to retake the quiz. It takes about two minutes, and what you see adapts to your answers.',
  },
  {
    q: 'Who can see my boards?',
    a: 'Only you, unless you share one. Boards marked private are never shown to anyone else, even if they have the link.',
  },
  {
    q: 'How do treatment reminders work?',
    a: 'Add a treatment in the Planner under Treatments, choose how often and when, and turn on Remind me.',
  },
  {
    q: 'How do I download or delete my data?',
    a: 'Go to Settings, then Privacy and data. You can request a copy of everything we hold, or delete your account for good.',
  },
];

const useStyles = makeStyles(() => ({
  item: { paddingHorizontal: space.lg, paddingVertical: space.md + 2, gap: space.sm },
  question: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  questionText: { flex: 1 },
}));

export default function FaqsScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Screen title="Questions" back testID="faqs-screen">
      <Section>
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          return (
            <Pressable
              key={faq.q}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              onPress={() => {
                haptics.selection();
                setOpen(isOpen ? null : i);
              }}
            >
              <View style={styles.question}>
                <Text variant="callout" style={styles.questionText}>
                  {faq.q}
                </Text>
                <ChevronDown
                  size={18}
                  color={theme.colors.text.tertiary}
                  style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
                />
              </View>
              {isOpen && (
                <Animated.View entering={FadeIn.duration(180)}>
                  <Text variant="body" tone="secondary">
                    {faq.a}
                  </Text>
                </Animated.View>
              )}
            </Pressable>
          );
        })}
      </Section>
    </Screen>
  );
}
