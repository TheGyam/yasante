import { useLocalSearchParams } from 'expo-router';
import { HairQuiz, sectionFor, type SectionKey } from '@/features/profile';

/** One part of the hair profile, answered on its own and saved straight away. */
export default function HairProfileSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return (
    <HairQuiz mode="section" section={(sectionFor(section)?.key ?? 'texture') as SectionKey} />
  );
}
