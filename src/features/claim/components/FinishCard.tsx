import { useRouter } from '@/shared/lib/navigation';
import { ListRow } from '@/shared/ui/ListRow';
import { Section } from '@/shared/ui/Section';
import { Sparkles } from 'lucide-react-native';
import { finishProgress } from '../format';
import { useFinishState } from '../hooks';

/** At the top of Today, until a page Yasante set up is ready to take bookings. */
export function FinishCard() {
  const router = useRouter();
  const { data } = useFinishState();
  if (!data || data.done) return null;
  return (
    <Section>
      <ListRow
        title="Finish your page"
        subtitle={`${finishProgress(data)} of 3 done`}
        icon={Sparkles}
        onPress={() => router.push('/finish')}
        testID="finish-card"
      />
    </Section>
  );
}
