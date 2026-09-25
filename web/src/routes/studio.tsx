import { Outlet, useParams } from 'react-router';
import { RequireAccount, useSession } from '@/features/auth';
import { RequestScreen, RequestsScreen } from '@/features/booking';
import { PostWorkScreen, YourWorkScreen } from '@/features/looks';
import { AccountScreen, StudioLayout, TodayScreen } from '@/features/studio';
import {
  HoursScreen,
  MenuScreen,
  PaymentsScreen,
  ServiceScreen,
  useMyProfile,
} from '@/features/stylist';

/** Her studio's frame: signed in, email confirmed, a page set up. */
export function StudioRoute() {
  const session = useSession();
  return (
    <RequireAccount>
      {session && (
        <StudioLayout key={session.user.id} accountId={session.user.id}>
          <Outlet />
        </StudioLayout>
      )}
    </RequireAccount>
  );
}

/** Inside the studio the session is always there: the frame above made sure. */
function useAccountId() {
  return useSession()!.user.id;
}

export function TodayRoute() {
  return <TodayScreen accountId={useAccountId()} />;
}

export function RequestsRoute() {
  return <RequestsScreen />;
}

export function RequestRoute() {
  const { id = '' } = useParams();
  const { data: profile } = useMyProfile(useAccountId());
  return <RequestScreen key={id} id={id} paymentMethods={profile?.paymentMethods ?? []} />;
}

export function YourWorkRoute() {
  return <YourWorkScreen accountId={useAccountId()} />;
}

export function PostWorkRoute() {
  return <PostWorkScreen accountId={useAccountId()} />;
}

export function MenuRoute() {
  return <MenuScreen accountId={useAccountId()} />;
}

export function ServiceRoute() {
  const { id } = useParams();
  return <ServiceScreen key={id ?? 'new'} accountId={useAccountId()} id={id} />;
}

export function HoursRoute() {
  const accountId = useAccountId();
  const { data: profile } = useMyProfile(accountId);
  return profile ? <HoursScreen accountId={accountId} profile={profile} /> : null;
}

export function PaymentsRoute() {
  const accountId = useAccountId();
  const { data: profile } = useMyProfile(accountId);
  return profile ? <PaymentsScreen accountId={accountId} profile={profile} /> : null;
}

export function AccountRoute() {
  return <AccountScreen accountId={useAccountId()} />;
}
