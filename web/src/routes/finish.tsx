import { lazy, Suspense } from 'react';
import { RequireAccount } from '@/features/auth';
import { Page } from '@/shared/ui/Page';
import { Skeleton } from '@/shared/ui/Skeleton';

const FinishScreen = lazy(() =>
  import('@/features/claim').then(m => ({ default: m.FinishScreen }))
);

export default function FinishRoute() {
  return (
    <RequireAccount>
      <Suspense
        fallback={
          <Page title="Finish your page">
            <Skeleton style={{ height: 320, borderRadius: 20 }} />
          </Page>
        }
      >
        <FinishScreen />
      </Suspense>
    </RequireAccount>
  );
}
