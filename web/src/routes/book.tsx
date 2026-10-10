import { useParams, useSearchParams } from 'react-router';
import { RequireAccount } from '@/features/auth';
import { BookScreen, BookingScreen, BookingsScreen } from '@/features/booking';

/** yasante.com/book/{handle}: anyone can fill it in; sending asks for an account. */
export default function BookRoute() {
  const { handle = '' } = useParams();
  const [params] = useSearchParams();
  return (
    <BookScreen
      key={handle}
      handle={handle}
      serviceId={params.get('service') ?? undefined}
      lookId={params.get('look') ?? undefined}
      day={params.get('date') ?? undefined}
    />
  );
}

export function BookingsRoute() {
  return (
    <RequireAccount client>
      <BookingsScreen />
    </RequireAccount>
  );
}

export function BookingRoute() {
  const { id = '' } = useParams();
  return (
    <RequireAccount client>
      <BookingScreen key={id} id={id} />
    </RequireAccount>
  );
}
