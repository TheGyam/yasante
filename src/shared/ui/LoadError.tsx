import { CloudOff, WifiOff } from 'lucide-react-native';
import { errorMessage, isConnectionProblem } from '@/shared/lib/errors';
import { EmptyState } from './EmptyState';

/**
 * A screen whose first load failed: what didn't load, why in plain words (offline,
 * too slow, or our side), and a way to try again. Never an empty "nothing here",
 * which would tell her she has nothing when the truth is we couldn't fetch it.
 */
export function LoadError({
  what,
  error,
  onRetry,
  retrying,
}: {
  /** "your bookings", "looks": finishes "Couldn’t load …". */
  what: string;
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const offline = isConnectionProblem(error);
  return (
    <EmptyState
      icon={offline ? WifiOff : CloudOff}
      title={`Couldn’t load ${what}`}
      message={errorMessage(error, 'Please try again in a moment.')}
      actionLabel="Try again"
      onAction={onRetry}
      actionLoading={retrying}
    />
  );
}
