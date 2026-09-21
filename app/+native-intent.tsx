import { parsePlannerLink } from '@/features/planner';
import { routeForLink } from '@/shared/lib/links';

/**
 * Where an incoming link lands. Shared planner links open their screen; a
 * yasante.com link opens the matching one — her bio link opens her page.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const link = parsePlannerLink(path);
  if (link?.kind === 'collection') return `/collections/${encodeURIComponent(link.id)}`;
  if (link?.kind === 'care-plan') return `/care-plans/${encodeURIComponent(link.id)}`;
  return routeForLink(path);
}
