import type { RouteObject } from 'react-router';
import { StaffShell } from '@/features/staff';
import { EmptyState } from '@/shared/ui/EmptyState';
import OverviewRoute from './routes/overview';
import ToolsRoute from './routes/tools';
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
    children: [
      { path: '/', element: <OverviewRoute /> },
      { path: '/tools', element: <ToolsRoute /> },
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
