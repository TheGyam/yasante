import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { RefreshCw } from 'lucide-react';
import { reportError } from '@/shared/lib/errorReport';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

/** When a page breaks: say so plainly, offer a reload, and tell the server once. */
export function RouteError() {
  const error = useRouteError();
  useEffect(() => reportError(error, { route: true }), [error]);
  return (
    <EmptyState
      as="h1"
      title="Something went wrong on this page"
      body="It’s been reported. Reloading usually fixes it."
      action={<Button label="Reload" icon={RefreshCw} onClick={() => location.reload()} />}
    />
  );
}
