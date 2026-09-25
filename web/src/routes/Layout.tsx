import { Outlet, ScrollRestoration } from 'react-router';
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
  const signedIn = !!useSession();
  return (
    <>
      <a className="visually-hidden" href="#main">
        Skip to content
      </a>
      <SiteHeader
        links={[
          { label: 'Looks', to: '/looks' },
          signedIn
            ? { label: 'Your studio', to: '/today' }
            : { label: 'For stylists', to: '/auth/signup' },
        ]}
        appTo="/#waitlist"
      />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter links={POLICIES} />
      <ScrollRestoration />
    </>
  );
}
