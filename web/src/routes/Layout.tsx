import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router';
import { useSession, useSignOut } from '@/features/auth';
import { Button } from '@/shared/ui/Button';
import { SiteFooter } from '@/shared/ui/SiteFooter';
import { SiteHeader } from '@/shared/ui/SiteHeader';

const POLICIES = [
  { label: 'Terms', to: '/terms' },
  { label: 'Stylist terms', to: '/stylist-terms' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Guidelines', to: '/guidelines' },
];

/** The frame around every page. */
export default function Layout() {
  const session = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const stylist = session?.user.roles.includes('stylist');
  // The home page opens on its hero, and the header floats inside it.
  const home = useLocation().pathname === '/';
  return (
    <>
      <a className="visually-hidden" href="#main">
        Skip to content
      </a>
      <SiteHeader
        links={[
          { label: 'Looks', to: '/looks' },
          !session
            ? { label: 'For stylists', to: '/auth/signup' }
            : stylist
              ? { label: 'Your studio', to: '/today' }
              : { label: 'Your bookings', to: '/bookings' },
        ]}
        appTo="/#waitlist"
        overlay={home}
        account={
          session && (
            <Button
              label="Sign out"
              size="sm"
              variant="ghost"
              disabled={signOut.isPending}
              // Off any page that needs an account, so nothing private stays on screen.
              onClick={() => signOut.mutate(undefined, { onSettled: () => navigate('/') })}
            />
          )
        }
      />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter links={POLICIES} />
      <ScrollRestoration />
    </>
  );
}
