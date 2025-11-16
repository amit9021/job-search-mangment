import { useQuery } from '@tanstack/react-query';
import { useApi } from './ApiProvider';

export type DashboardActionSuggestion = 'follow_up' | 'send_outreach' | 'apply' | 'review';
export type DashboardQueueItemType = 'follow_up' | 'task' | 'stale_outreach';
export type DashboardNotificationSeverity = 'high' | 'med' | 'low';

export type DashboardSummaryResponse = {
  kpis: {
    tailoredCvs: { sentToday: number; targetDaily: number; spark: number[] };
    outreach: { sentToday: number; targetDaily: number; spark: number[] };
    followUpsDue: number;
    seniorReviewsThisWeek: number;
  };
  nextBestAction: {
    title: string;
    reason: string;
    suggestedAction: DashboardActionSuggestion;
    job: { id: string; company: string; role: string; heat: number } | null;
    ctaLink: string;
  };
  notifications: Array<{ severity: DashboardNotificationSeverity; text: string; ctaLink: string | null }>;
  todayQueue: Array<{
    type: DashboardQueueItemType;
    title: string;
    dueAt: string | null;
    ctaLink: string;
    context?: {
      jobId?: string;
      contactId?: string;
      taskId?: string;
      followupId?: string;
      followupType?: string;
      appointmentMode?: string | null;
      outreachId?: string;
    };
  }>;
};

type DashboardSummaryMeta = {
  cache: 'hit' | 'miss';
  degraded: boolean;
};

export type DashboardSummaryResult = {
  summary: DashboardSummaryResponse;
  meta: DashboardSummaryMeta;
};

const CACHE_WINDOW_MS = 30_000;
const REFRESH_INTERVAL_MS = 60_000;

export const useDashboardSummary = (range: 7 | 14 | 30) => {
  const api = useApi();

  return useQuery({
    queryKey: ['dashboard', 'summary', range],
    queryFn: async (): Promise<DashboardSummaryResult> => {
      const response = await api.get<DashboardSummaryResponse>('/dashboard/summary', {
        params: { range }
      });

      const cacheHeader = String(response.headers['x-dashboard-cache'] ?? '').toLowerCase();
      const degradedHeader = String(response.headers['x-dashboard-degraded'] ?? '').toLowerCase();

      return {
        summary: response.data,
        meta: {
          cache: cacheHeader === 'hit' ? 'hit' : 'miss',
          degraded: degradedHeader === 'true'
        }
      };
    },
    staleTime: CACHE_WINDOW_MS,
    gcTime: CACHE_WINDOW_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: 1
  });
};
