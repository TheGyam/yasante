import { useStyles } from '@/features/looks';
import { Page } from '@/shared/ui/Page';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Listing, NothingHere } from './Listing';

/** yasante.com/styles/{slug}: knotless braids, cornrows, … */
export function StyleScreen({ slug }: { slug: string }) {
  const { data: styleList, isPending } = useStyles();
  const style = styleList?.find(s => s.id === slug);

  if (isPending) {
    return (
      <Page>
        <Skeleton style={{ height: 48, width: '60%' }} />
      </Page>
    );
  }
  if (!style) return <NothingHere what="that style" />;

  return (
    <Listing
      title={`${style.name} in London`}
      intro={`${style.name} by stylists on Yasante, on real hair.`}
      looks={{ style: slug }}
      stylists={{ style: slug }}
    />
  );
}
