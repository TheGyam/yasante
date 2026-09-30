import { lazy } from 'react';

export { Today } from './components/today/Today';
export { PasswordForm } from './components/PasswordForm';
export { QuickEdit } from './components/QuickEdit';
export { RecordPage } from './components/records/RecordPage';
export { RecordHistory } from './components/RecordHistory';
export { RecordList } from './components/records/RecordList';
export { StaffShell, useStaffContext } from './components/shell/StaffShell';
export { useOverviewRefresh } from './hooks';
export { ReviewScreen } from './components/review/ReviewScreen';
export { AccountPage } from './components/AccountPage';

// The chart-heavy pages load when first opened, so the rest of the workspace starts fast.
export const Insights = lazy(() =>
  import('./components/insights/Insights').then(m => ({ default: m.Insights }))
);
export const ErrorList = lazy(() =>
  import('./components/errors/ErrorList').then(m => ({ default: m.ErrorList }))
);
export const ErrorDetail = lazy(() =>
  import('./components/errors/ErrorDetail').then(m => ({ default: m.ErrorDetail }))
);
export const BusinessMetrics = lazy(() =>
  import('./components/BusinessMetrics').then(m => ({ default: m.BusinessMetrics }))
);
