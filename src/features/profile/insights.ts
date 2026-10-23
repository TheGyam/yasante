import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { apiClient, type ApiSchemas } from '@/shared/lib/api';

/** Your hair in numbers: this month, or since you started. */
export type Insights = ApiSchemas['Insights'];
export type InsightsPeriod = Insights['period'];

export function useInsights(period: InsightsPeriod) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['insights', user?.id, period],
    queryFn: async () =>
      (await apiClient.get<Insights>('/api/insights/', { params: { period } })).data,
    enabled: !!user?.id,
    // Slow-moving numbers: a few minutes old is fine.
    staleTime: 5 * 60 * 1000,
  });
}

/** One line for the Profile card: the most telling thing this month. */
export function insightsHeadline(i?: Insights) {
  if (!i) return undefined;
  if (i.currentStyle) return `${i.currentStyle.name}, day ${i.currentStyle.days + 1}`;
  if (i.length?.grewCm && i.length.grewCm > 0) return `Up ${i.length.grewCm} cm`;
  if (i.appointments) return `${i.appointments} appointment${i.appointments > 1 ? 's' : ''}`;
  if (i.washes) return `${i.washes} wash day${i.washes > 1 ? 's' : ''}`;
  return 'Your appointments, length and care, in one place';
}
