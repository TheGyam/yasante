import { useAreas } from '@/features/looks';
import { slugify } from '@/shared/lib/format';
import { Listing } from './Listing';

/** yasante.com/areas/{slug}: braiders based in one district, and their work. */
export function AreaScreen({ slug }: { slug: string }) {
  const { data: areas } = useAreas();
  // The name as people write it, once the list of areas has it; the address meanwhile.
  const name =
    areas?.find(area => slugify(area) === slug) ??
    slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Listing
      title={`Braiders in ${name}`}
      intro={`Braiders based in ${name}, and their work.`}
      looks={{ area: name }}
      stylists={{ area: name }}
    />
  );
}
