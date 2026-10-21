import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useLookFilters } from '../filters';

const ORDERS = [
  { value: 'for-you', label: 'For you' },
  { value: 'latest', label: 'Latest' },
] as const;

/**
 * How the home feed is ordered: picked for her, or newest first with nothing personal.
 * The phone remembers the choice; the Looks screen's Latest chip is the same setting.
 */
export function FeedOrderSwitch() {
  const latest = useLookFilters(s => s.latest);
  const setLatest = useLookFilters(s => s.setLatest);
  return (
    <SegmentedControl
      options={ORDERS}
      value={latest ? 'latest' : 'for-you'}
      onChange={value => setLatest(value === 'latest')}
    />
  );
}
