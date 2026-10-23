import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type ApiSchemas } from '@/shared/lib/api';
import { REPORT_REASONS } from './types';

/** A report she made, and what happened to it. */
export type MyReport = ApiSchemas['MyReport'];
/** Something done to her own content, and her appeal if she made one. */
export type MyModerationAction = ApiSchemas['MyModeration'];

const REPORTS_KEY = ['moderation', 'reports'];
const ACTIONS_KEY = ['moderation', 'actions'];

export function useMyReports() {
  return useQuery({
    queryKey: REPORTS_KEY,
    queryFn: async () => (await apiClient.get<MyReport[]>('/api/reports/mine/')).data,
  });
}

export function useMyModeration() {
  return useQuery({
    queryKey: ACTIONS_KEY,
    queryFn: async () => (await apiClient.get<MyModerationAction[]>('/api/moderation/mine/')).data,
  });
}

export function useAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) =>
      (
        await apiClient.post<ApiSchemas['AppealResponse']>(`/api/moderation/${id}/appeal/`, {
          body,
        })
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACTIONS_KEY }),
  });
}

const TARGETS: Record<string, string> = {
  look: 'look',
  lookcomment: 'comment',
  review: 'review',
  stylistprofile: 'page',
  collection: 'collection',
  careplan: 'care plan',
};

/** "look", "comment", "review", "page", "collection", "care plan". */
export const targetNoun = (target: string) => TARGETS[target] ?? 'post';

export const ACTION_LABELS: Record<MyModerationAction['action'], string> = {
  hide: 'Hidden',
  remove: 'Removed',
  unpublish: 'Taken down',
};

/** What was done, in words that fit what it was done to: a shared collection or plan stays hers, unshared. */
export const actionLabel = (action: MyModerationAction['action'], target: string) =>
  target === 'collection' || target === 'careplan' ? 'No longer shared' : ACTION_LABELS[action];

export const REPORT_STATUS_LABELS: Record<MyReport['status'], string> = {
  open: 'Being looked at',
  actioned: 'Action taken',
  dismissed: 'Reviewed, left up',
};

export const APPEAL_STATUS_LABELS: Record<string, string> = {
  open: 'Appeal being looked at',
  upheld: 'Appeal refused',
  overturned: 'Appeal accepted, restored',
};

const REVIEW_REASONS: Record<string, string> = {
  'not-real': "The appointment didn't happen",
  private: 'It shares private details',
};

/** What she's told once a report is sent; anyone in danger now needs more than a report. */
export const reportSentMessage = (reason: string) =>
  reason === 'illegal'
    ? 'We’ll look at this first. If anyone is in danger right now, call 999. We won’t say who reported it.'
    : 'Someone will look at this. We won’t say who reported it.';

export const reportReasonLabel = (reason: string) =>
  REPORT_REASONS.find(r => r.value === reason)?.label ?? REVIEW_REASONS[reason] ?? 'Something else';
