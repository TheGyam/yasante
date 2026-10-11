import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useSession } from '@/features/auth';
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
      />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter links={POLICIES} />
      <ScrollRestoration />
    </>
  );
}
