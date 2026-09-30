import { Overview, useOverviewRefresh, useStaffContext } from '@/features/staff';
export default function Route() {
  const data = useStaffContext();
  const query = useOverviewRefresh();
  return (
    <Overview data={data} refreshing={query.isFetching} refresh={() => void query.refetch()} />
  );
}
