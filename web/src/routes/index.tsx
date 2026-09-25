import { createBrowserRouter } from 'react-router';
import AreaRoute from './area';
import HomeRoute from './home';
import Layout from './Layout';
import LookRoute from './look';
import LooksRoute from './looks';
import NotFoundRoute from './not-found';
import { policyRoute } from './policy';
import ResetPasswordRoute from './reset-password';
import LoginRoute from './login';
import SignupRoute from './signup';
import StylistSetupRoute from './stylist-setup';
import VerifyEmailRoute from './verify-email';
import StyleRoute from './style';
import StylistRoute from './stylist';

/**
 * Every page on yasante.com. The addresses match the app's (a shared link opens the
 * same thing in either), and backend/apps/web/urls.py serves each one's HTML.
 * Add a page in both places.
 */
export const routes = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomeRoute /> },
      { path: '/looks', element: <LooksRoute /> },
      { path: '/looks/:id', element: <LookRoute /> },
      { path: '/styles/:slug', element: <StyleRoute /> },
      { path: '/areas/:slug', element: <AreaRoute /> },
      { path: '/terms', Component: policyRoute('terms') },
      { path: '/stylist-terms', Component: policyRoute('stylist_terms') },
      { path: '/privacy', Component: policyRoute('privacy') },
      { path: '/guidelines', Component: policyRoute('guidelines') },
      { path: '/auth/reset-password', element: <ResetPasswordRoute /> },
      // A stylist's account and page, on the web as in the app.
      { path: '/auth/signup', element: <SignupRoute /> },
      { path: '/auth/login', element: <LoginRoute /> },
      { path: '/auth/verify-email', element: <VerifyEmailRoute /> },
      { path: '/stylist-setup', element: <StylistSetupRoute /> },
      // Last: her bio link, yasante.com/{handle}.
      { path: '/:handle', element: <StylistRoute /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
