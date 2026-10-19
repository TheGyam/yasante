import { Avatar } from '@/shared/ui/Avatar';
import { ListRow } from '@/shared/ui/ListRow';
import { usePrefetchStylist } from '../hooks';
import type { StylistSearchResult } from '../types';
import { SEP } from '@/shared/lib/format';

/** A braider in a list, opening her page. */
export function StylistRow({ stylist }: { stylist: StylistSearchResult }) {
  const prefetch = usePrefetchStylist();
  return (
    <ListRow
      leading={<Avatar name={stylist.displayName} uri={stylist.avatarUri} size={44} />}
      title={stylist.displayName}
      subtitle={`@${stylist.handle}${SEP}${stylist.baseArea}`}
      to={`/${stylist.handle}`}
      preload={() => prefetch(stylist.handle)}
    />
  );
}
