import { parsePlannerLink } from '@/features/planner';

/** Shared planner links open the matching screen; everything else routes as-is. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const link = parsePlannerLink(path);
  if (link?.kind === 'collection') return `/collections/${encodeURIComponent(link.id)}`;
  if (link?.kind === 'care-plan') return `/care-plans/${encodeURIComponent(link.id)}`;
  return path;
}
