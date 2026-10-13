import { useAreas } from '@/features/looks';
import { useStylistSearch } from '@/features/stylist';
import { slugify } from '@/shared/lib/format';
import { Page } from '@/shared/ui/Page';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Listing, NothingHere } from './Listing';

/**
 * yasante.com/areas/{slug}: braiders based in one district, and their work. Only a
 * district someone is actually in: any other address is "not found", never a page
 * titled with whatever words were typed into it.
 */
export function AreaScreen({ slug }: { slug: string }) {
  const { data: areas, isPending: areasPending } = useAreas();
  const guess = slug.replace(/-/g, ' ');
  // Districts with looks come from the list; one with braiders but no looks yet, from them.
  const { data: found, isPending: stylistsPending } = useStylistSearch({ area: guess });
  const name =
    areas?.find(area => slugify(area) === slug) ??
    found?.find(stylist => slugify(stylist.baseArea) === slug)?.baseArea;

  if (!name && (areasPending || stylistsPending)) {
    return (
      <Page>
        <Skeleton style={{ height: 48, width: '60%' }} />
      </Page>
    );
  }
  if (!name) return <NothingHere what="that area" />;

  return (
    <Listing
      title={`Stylists in ${name}`}
      intro={`Stylists based in ${name}, and their work.`}
      looks={{ area: name }}
      stylists={{ area: name }}
    />
  );
}
