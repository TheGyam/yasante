import { SearchX } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Page } from '@/shared/ui/Page';

export default function NotFoundRoute() {
  return (
    <Page title="Not found">
      <EmptyState
        as="h1"
        icon={SearchX}
        title="There’s nothing at this address"
        body="The link may be old, or have a typo in it."
        action={<Button label="Go to the home page" variant="secondary" size="md" to="/" />}
      />
    </Page>
  );
}
