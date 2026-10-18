import { lazy, Suspense } from 'react';
import { useParams } from 'react-router';
import { Page } from '@/shared/ui/Page';
import { Skeleton } from '@/shared/ui/Skeleton';

const ClaimScreen = lazy(() => import('@/features/claim').then(m => ({ default: m.ClaimScreen })));

export default function ClaimRoute() {
  const { code = '' } = useParams();
  return (
    <Suspense
      fallback={
        <Page title="Make this page yours" noIndex>
          <Skeleton style={{ height: 320, borderRadius: 20 }} />
        </Page>
      }
    >
      <ClaimScreen code={code} />
    </Suspense>
  );
}
