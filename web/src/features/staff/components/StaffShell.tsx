import { Button } from '@/shared/ui/Button';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { Outlet, useOutletContext } from 'react-router';
import { staffMessage, useStaffMutation, useStaffRead } from '../hooks';
import type { Overview as OverviewData, Session } from '../types';
import { CommandPalette } from './CommandPalette';
import { Sidebar } from './Sidebar';
import { SignIn } from './SignIn';
import * as s from './StaffShell.css';
import { TwoFactor } from './TwoFactor';
import { useState } from 'react';

export function StaffShell() {
  const session = useStaffRead<Session>('session/');
  const overview = useStaffRead<OverviewData>('overview/', {
    enabled: session.data?.authenticated === true,
    refetchInterval: 60000,
  });
  const mutate = useStaffMutation();
  const [signOutError, setSignOutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  if (session.isError) return <InlineAlert message={staffMessage(session.error)} />;
  if (!session.data) return <Skeleton className={s.loadingPanel} />;
  if (!session.data.authenticated)
    return session.data.phase === 'password' ? (
      <SignIn />
    ) : (
      <TwoFactor csrf={session.data.csrfToken} />
    );
  if (overview.isError) return <InlineAlert message={staffMessage(overview.error)} />;
  if (!overview.data) return <Skeleton className={s.loadingPanel} />;
  const data = overview.data;
  return (
    <div className={s.shell}>
      <a className={s.skip} href="#staff-main">
        Skip to workspace content
      </a>
      <Sidebar data={data} />
      <div className={s.main}>
        <header className={s.topbar}>
          <Text variant="callout">
            {data.user.name} · {data.user.superuser ? 'Administrator' : 'Staff'}
          </Text>
          <CommandPalette models={data.models} />
          <Button
            label="Sign out"
            variant="ghost"
            size="sm"
            loading={signingOut}
            onClick={async () => {
              const body = new FormData();
              body.set('intent', 'logout');
              setSigningOut(true);
              setSignOutError('');
              try {
                await mutate('session/', body, session.data!.csrfToken);
              } catch (error) {
                setSignOutError(staffMessage(error));
              } finally {
                setSigningOut(false);
              }
            }}
          />
        </header>
        <main id="staff-main" className={s.content}>
          {signOutError && <InlineAlert message={signOutError} />}
          <Outlet context={data} />
        </main>
      </div>
    </div>
  );
}

export function useStaffContext() {
  return useOutletContext<OverviewData>();
}
