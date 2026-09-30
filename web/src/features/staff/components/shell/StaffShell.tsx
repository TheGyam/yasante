import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Keyboard, LogOut, Moon, Sun, UserPlus } from 'lucide-react';
import { InlineAlert } from '@/shared/ui/InlineAlert';
import { Sheet } from '@/shared/ui/Sheet';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Toaster, toast } from '@/shared/ui/Toast';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import {
  staffMessage,
  useLocalSetting,
  useShortcuts,
  useStaffMutation,
  useStaffRead,
} from '../../hooks';
import { locate, navigation, pages } from '../../nav';
import type { Overview, Session } from '../../types';
import { SignIn } from '../SignIn';
import { TwoFactor } from '../TwoFactor';
import { AccountMenu, type ThemeChoice } from './AccountMenu';
import { CommandPalette, type PaletteAction } from './CommandPalette';
import { MobileNav } from './MobileNav';
import { ShortcutsDialog } from './ShortcutsDialog';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import * as s from './StaffShell.css';

/** Signs staff in (password, then the second factor), then frames every page. */
export function StaffShell() {
  const session = useStaffRead<Session>('session/');
  const overview = useStaffRead<Overview>('overview/', {
    enabled: session.data?.authenticated === true,
    refetchInterval: 60_000,
  });
  const [theme, setTheme] = useLocalSetting<ThemeChoice>('theme', 'system');
  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (session.isError)
    return (
      <Gate>
        <InlineAlert message={staffMessage(session.error)} />
      </Gate>
    );
  if (!session.data)
    return (
      <Gate>
        <Skeleton className={s.loading} />
      </Gate>
    );
  if (!session.data.authenticated)
    return session.data.phase === 'password' ? (
      <SignIn />
    ) : (
      <TwoFactor csrf={session.data.csrfToken} />
    );
  if (overview.isError)
    return (
      <Gate>
        <InlineAlert message={staffMessage(overview.error)} />
      </Gate>
    );
  if (!overview.data)
    return (
      <Gate>
        <Skeleton className={s.loading} />
      </Gate>
    );
  return (
    <Workspace
      data={overview.data}
      refreshing={overview.isFetching}
      theme={theme}
      setTheme={setTheme}
      csrf={session.data.csrfToken}
    />
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return <div className={s.gate}>{children}</div>;
}

function Workspace({
  data,
  refreshing,
  theme,
  setTheme,
  csrf,
}: {
  data: Overview;
  refreshing: boolean;
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
  csrf: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const mutate = useStaffMutation();
  const [rail, setRail] = useLocalSetting<'wide' | 'rail'>('rail', 'wide');
  // Tablets start on the rail whatever the saved choice; expanding lasts for the visit.
  const tablet = useMediaQuery('(min-width: 768px) and (max-width: 1100px)');
  const [tabletWide, setTabletWide] = useState(false);
  const narrow = tablet ? !tabletWide : rail === 'rail';
  const toggleRail = (next: boolean) =>
    tablet ? setTabletWide(!next) : setRail(next ? 'rail' : 'wide');
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [more, setMore] = useState(false);

  const sections = useMemo(() => navigation(data), [data]);
  const allPages = useMemo(() => pages(data), [data]);
  const here = locate(sections, location.pathname);
  const crumbs = here
    ? here.section.name === 'Today'
      ? ['Today']
      : here.section.name === here.item.name
        ? [here.item.name]
        : [here.section.name, here.item.name]
    : [location.pathname.startsWith('/account') ? 'Your account' : 'Workspace'];
  const reviewUrl = (data.queues.find(queue => queue.count) ?? data.queues[0])?.url ?? '/';
  const url = (key: string) => data.models.find(model => model.key === key)?.url;

  const signOut = async () => {
    const body = new FormData();
    body.set('intent', 'logout');
    try {
      await mutate('session/', body, csrf);
    } catch (error) {
      toast(staffMessage(error), { tone: 'danger' });
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPalette(open => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (target: string | undefined) => () => target && navigate(target);
  useShortcuts({
    '/': () => setPalette(true),
    '?': () => setShortcuts(true),
    '[': () => toggleRail(!narrow),
    'g o': go('/'),
    'g r': go(reviewUrl),
    'g p': go(url('accounts.user')),
    'g b': go(url('bookings.booking')),
    'g i': go('/insights'),
  });

  const add = (key: string) => data.models.find(model => model.key === key)?.addUrl;
  const actions: PaletteAction[] = [
    ...(add('accounts.invite')
      ? [{ name: 'Invite someone', icon: UserPlus, run: go(add('accounts.invite')!) }]
      : []),
    ...data.models
      .filter(model => model.addUrl && model.key !== 'accounts.invite')
      .map(model => ({ name: `New ${model.singular}`, icon: UserPlus, run: go(model.addUrl!) })),
    { name: 'Use the light theme', icon: Sun, run: () => setTheme('light') },
    { name: 'Use the dark theme', icon: Moon, run: () => setTheme('dark') },
    { name: 'Keyboard shortcuts', icon: Keyboard, run: () => setShortcuts(true) },
    { name: 'Sign out', icon: LogOut, run: () => void signOut() },
  ];

  const account = (compact: boolean) => (
    <AccountMenu
      user={data.user}
      rail={compact}
      theme={theme}
      onTheme={setTheme}
      onShortcuts={() => setShortcuts(true)}
      onSignOut={() => void signOut()}
    />
  );

  return (
    <div className={s.shell} data-rail={narrow}>
      <a className={s.skip} href="#staff-main">
        Skip to content
      </a>
      <aside className={s.aside}>
        <Sidebar
          sections={sections}
          pathname={location.pathname}
          rail={narrow}
          onRail={toggleRail}
          footer={account(narrow)}
        />
      </aside>
      <div className={s.main}>
        <TopBar
          crumbs={crumbs}
          models={data.models}
          refreshing={refreshing}
          onRefresh={() =>
            void cache.invalidateQueries({
              queryKey: ['staff'],
              predicate: query => query.queryKey[1] !== 'session',
            })
          }
          onSearch={() => setPalette(true)}
        />
        <main id="staff-main" className={s.content}>
          <Outlet context={data} />
        </main>
      </div>
      <MobileNav
        pathname={location.pathname}
        reviewUrl={reviewUrl}
        waiting={data.totalOpen}
        onSearch={() => setPalette(true)}
        onMore={() => setMore(true)}
      />
      <Sheet open={more} onClose={() => setMore(false)} title="Everything">
        <Sidebar
          sections={sections}
          pathname={location.pathname}
          onNavigate={() => setMore(false)}
          footer={account(false)}
        />
      </Sheet>
      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        pages={allPages}
        waiting={
          sections.find(section => section.name === 'Review')?.items.filter(item => item.count) ??
          []
        }
        actions={actions}
      />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
      <Toaster />
    </div>
  );
}

export function useStaffContext() {
  return useOutletContext<Overview>();
}
