import { parsePlannerLink } from '@/features/planner';

/** Shared planner links open the matching screen; everything else routes as-is. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const link = parsePlannerLink(path);
  if (link?.kind === 'board') return `/board/${encodeURIComponent(link.id)}`;
  if (link?.kind === 'treatment') return `/treatments/${encodeURIComponent(link.id)}`;
  return path;
}
