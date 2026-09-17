import { ArrowLeftRight } from 'lucide-react-native';
import { Badge } from '@/shared/ui/Badge';
import { ListRow } from '@/shared/ui/ListRow';
import { useStylistSummary } from '../hooks';
import { useActiveMode, useModeStore } from '../mode';

/**
 * "Switch to stylist mode" — for accounts with the stylist role (see `useIsStylist`). In
 * client mode it carries a badge when requests are waiting on the other side.
 */
export function ModeSwitchRow() {
  const active = useActiveMode();
  const beginSwitch = useModeStore(s => s.beginSwitch);
  const { data: summary } = useStylistSummary();

  const target = active === 'client' ? 'stylist' : 'client';
  const waiting = target === 'stylist' ? (summary?.pendingRequests ?? 0) : 0;

  return (
    <ListRow
      title={target === 'stylist' ? 'Switch to stylist mode' : 'Switch to client mode'}
      icon={ArrowLeftRight}
      haptic="medium"
      trailing={waiting > 0 ? <Badge label={`${waiting} new`} tone="accent" /> : undefined}
      onPress={event =>
        beginSwitch(target, { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })
      }
      testID="mode-switch"
    />
  );
}
