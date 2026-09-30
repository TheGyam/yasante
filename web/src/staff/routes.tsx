import type { RouteObject } from 'react-router';
import { StaffShell } from '@/features/staff';
import { RouteError } from '@/shared/ui/RouteError';
import { EmptyState } from '@/shared/ui/EmptyState';
import OverviewRoute from './routes/overview';
import ReviewRoute from './routes/review';
import InsightsRoute from './routes/insights';
import ErrorsRoute from './routes/errors';
import NotificationsRoute from './routes/notifications';
import MetricsRoute from './routes/metrics';
import PasswordRoute from './routes/password';
import RecordsRoute from './routes/records';
import FormRoute from './routes/form';
import HistoryRoute from './routes/history';
import RecordPasswordRoute from './routes/record-password';
import QuickEditRoute from './routes/quick-edit';
export const staffRoutes: RouteObject[] = [
  {
    element: <StaffShell />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <OverviewRoute /> },
      { path: '/review', element: <ReviewRoute /> },
      { path: '/insights', element: <InsightsRoute /> },
      { path: '/errors', element: <ErrorsRoute /> },
      { path: '/notifications', element: <NotificationsRoute /> },
      { path: '/notifications/:action', element: <NotificationsRoute /> },
      { path: '/errors/:id', element: <ErrorsRoute /> },
      { path: '/account', element: <PasswordRoute /> },
      { path: '/review/:queue', element: <ReviewRoute /> },
      { path: '/metrics', element: <MetricsRoute /> },
      { path: '/password', element: <PasswordRoute /> },
      { path: '/records/:app/:model', element: <RecordsRoute /> },
      { path: '/records/:app/:model/new', element: <FormRoute /> },
      { path: '/records/:app/:model/quick-edit', element: <QuickEditRoute /> },
      { path: '/records/:app/:model/:id', element: <FormRoute /> },
      { path: '/records/:app/:model/:id/history', element: <HistoryRoute /> },
      { path: '/records/:app/:model/:id/password', element: <RecordPasswordRoute /> },
      {
        path: '*',
        element: (
          <EmptyState title="Page not found" body="Choose a tool from the workspace navigation." />
        ),
      },
    ],
  },
];
