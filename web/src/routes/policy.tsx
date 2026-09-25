import { PolicyScreen, type PolicyType } from '@/features/policy';

/** /terms, /stylist-terms, /privacy, /guidelines. */
export function policyRoute(type: PolicyType) {
  return function PolicyRoute() {
    return <PolicyScreen type={type} />;
  };
}
