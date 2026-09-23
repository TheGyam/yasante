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
    q: 'What is a look?',
    a: 'A photo of real hair, posted by the person wearing it or the stylist who did it. When a look was booked through Yasante, it credits the stylist and the service, so you can book the same. Double-tap a photo to like it.',
  },
  {
    q: 'How do I save looks?',
    a: 'Tap the bookmark on any look and pick a collection, or start a new one. Your collections are in the Planner tab. Private ones are seen by you alone.',
  },
  {
    q: 'How do I book a stylist?',
    a: 'Open her page from a look, choose Request a booking, then pick the service and a time she’s free. She has 48 hours to reply. Any deposit is paid straight to her; Yasante never handles money.',
  },
  {
    q: 'When do I see the stylist’s address?',
    a: 'Once she confirms your booking. Until then her page shows the district only.',
  },
  {
    q: 'She’s fully booked. Can I wait for a slot?',
    a: 'Yes. On her page, choose Tell me if a slot opens and pick the days you could do. If someone cancels, you’ll see it on your home screen.',
  },
  {
    q: 'How do I change my hair profile?',
    a: 'Tap the Your hair card on your profile. You can update any answer, and what you see adapts to it.',
  },
  {
    q: 'What is a care plan?',
    a: 'Your routine, written down: the steps and how often you do them. Start one in the Planner tab, under Care plans, and tick off each session as you go.',
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
