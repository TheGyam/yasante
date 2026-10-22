import { Link2Off } from 'lucide-react';
import { errorMessage, isNotFound } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Page } from '@/shared/ui/Page';

/** A link that's stopped, deleted or never was; or one that didn't load. */
export function Gone({ error, retry }: { error: unknown; retry: () => void }) {
  const gone = isNotFound(error);
  return (
    <Page title={gone ? 'This isn’t shared any more' : 'Couldn’t load this'} noIndex>
      <EmptyState
        as="h1"
        icon={Link2Off}
        title={gone ? 'This isn’t shared any more' : 'Couldn’t load this'}
        body={
          gone
            ? 'Whoever shared it has stopped sharing it, or it’s been deleted.'
            : errorMessage(error, 'Please try again in a moment.')
        }
        action={
          gone ? (
            <Button label="See looks" variant="secondary" size="md" to="/looks" />
          ) : (
            <Button label="Try again" variant="secondary" size="md" onClick={retry} />
          )
        }
      />
    </Page>
  );
}
