import { createBrowserRouter } from 'react-router';
import { RouteError } from '@/shared/ui/RouteError';
import AreaRoute from './area';
import DeleteAccountRoute from './delete-account';
import HomeRoute from './home';
import Layout from './Layout';
import LookRoute from './look';
import LooksRoute from './looks';
import NotFoundRoute from './not-found';
import { policyRoute } from './policy';
import ResetPasswordRoute from './reset-password';
import LoginRoute from './login';
import ForgotPasswordRoute from './forgot-password';
import SignupRoute from './signup';
import StylistSetupRoute from './stylist-setup';
import {
  AccountRoute,
  HoursRoute,
  MenuRoute,
  PaymentsRoute,
  PostWorkRoute,
  RequestRoute,
  RequestsRoute,
  ServiceRoute,
  StudioRoute,
  TodayRoute,
  YourWorkRoute,
} from './studio';
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
    errorElement: <RouteError />,
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
      { path: '/delete-account', element: <DeleteAccountRoute /> },
      { path: '/auth/reset-password', element: <ResetPasswordRoute /> },
      // A stylist's account and page, on the web as in the app.
      { path: '/auth/signup', element: <SignupRoute /> },
      { path: '/auth/login', element: <LoginRoute /> },
      { path: '/auth/forgot-password', element: <ForgotPasswordRoute /> },
      { path: '/auth/verify-email', element: <VerifyEmailRoute /> },
      { path: '/stylist-setup', element: <StylistSetupRoute /> },
      // Her studio: the app's stylist screens, at the app's addresses.
      {
        element: <StudioRoute />,
        children: [
          { path: '/today', element: <TodayRoute /> },
          { path: '/requests', element: <RequestsRoute /> },
          { path: '/requests/:id', element: <RequestRoute /> },
          { path: '/portfolio', element: <YourWorkRoute /> },
          { path: '/looks/new', element: <PostWorkRoute /> },
          { path: '/menu', element: <MenuRoute /> },
          { path: '/menu/new', element: <ServiceRoute /> },
          { path: '/menu/:id', element: <ServiceRoute /> },
          { path: '/availability', element: <HoursRoute /> },
          { path: '/payment-methods', element: <PaymentsRoute /> },
          { path: '/account', element: <AccountRoute /> },
        ],
      },
      // Last: her bio link, yasante.com/{handle}.
      { path: '/:handle', element: <StylistRoute /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
