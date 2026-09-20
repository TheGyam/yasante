import { View } from 'react-native';
import { Images, ScrollText } from 'lucide-react-native';
import { useMenu } from '@/features/stylist';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { SectionHeader } from '@/shared/ui/SectionHeader';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
}));

export default function PortfolioScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data: menu } = useMenu();
  const count = menu?.length ?? 0;

  return (
    <Screen title="Portfolio" tabBar testID="stylist-portfolio">
      <View style={styles.body}>
        <Section footer="The first thing a client asks for, answered before they ask.">
          <ListRow
            title="Menu and prices"
            subtitle={
              count ? `${count} ${count === 1 ? 'service' : 'services'}` : 'Nothing added yet'
            }
            icon={ScrollText}
            onPress={() => router.push('/menu')}
            testID="portfolio-menu"
          />
        </Section>
        <View>
          <SectionHeader title="Your work" />
          <EmptyState
            icon={Images}
            title="Show your work"
            message="Six photos or more lets clients see your style before they ask."
          />
        </View>
      </View>
    </Screen>
  );
}
