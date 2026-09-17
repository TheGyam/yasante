import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Screen } from '@/shared/ui/Screen';

export default function RequestsScreen() {
  return (
    <Screen title="Requests" tabBar testID="stylist-requests">
      <EmptyState
        icon={Inbox}
        title="No requests yet"
        message="When someone asks to book, you'll see their hair profile and record here, and accept, suggest another time or decline."
      />
    </Screen>
  );
}
