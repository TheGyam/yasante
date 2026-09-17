import { TabStack } from '@/shared/ui/TabStack';

export const unstable_settings = {
  initialRouteName: 'today',
  today: { initialRouteName: 'today' },
  requests: { initialRouteName: 'requests' },
  portfolio: { initialRouteName: 'portfolio' },
  account: { initialRouteName: 'account' },
};

const ROOTS: Record<string, string> = {
  '(today)': 'today',
  '(requests)': 'requests',
  '(portfolio)': 'portfolio',
  '(account)': 'account',
};

export default function StylistTabStack({ segment }: { segment: string }) {
  return <TabStack root={ROOTS[segment]} />;
}
