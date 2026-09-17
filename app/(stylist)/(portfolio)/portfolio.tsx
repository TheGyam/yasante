import { Images } from 'lucide-react-native';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Screen } from '@/shared/ui/Screen';

export default function PortfolioScreen() {
  return (
    <Screen title="Portfolio" tabBar testID="stylist-portfolio">
      <EmptyState
        icon={Images}
        title="Show your work"
        message="Six photos or more lets clients see your style before they ask. Your menu and prices live here too."
      />
    </Screen>
  );
}
