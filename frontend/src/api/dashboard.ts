import { useQuery } from '@tanstack/react-query';
import { useApi } from './ApiProvider';

export type DashboardActionSuggestion = 'follow_up' | 'send_outreach' | 'apply' | 'review';

export type DashboardQueueItemType = 'follow_up' | 'task' | 'stale_outreach';

export type DashboardNotificationSeverity = 'high' | 'med' | 'low';

export type DashboardSummary = {
  kpis: {
    tasks: {
      dueToday: number;
      overdue: number;
      velocity7d: number;
      streakDays: number;
    };
    tailoredCvs: { sentToday: number; dailyTarget: number };
    outreach: { warmSentToday: number; dailyTarget: number };
    followUpsDue: number;
    seniorReviewsThisWeek: number;
  };
  heat: {
    buckets: { h0: number; h1: number; h2: number; h3: number };
  };
  nextBestAction: {
    title: string;
    reason: string;
    suggestedAction: DashboardActionSuggestion;
    job: { id: string; company: string; role: string; heat: number } | null;
    ctaLink: string;
  };
  todayQueue: Array<{
    type: DashboardQueueItemType;
    title: string;
    dueAt: string | null;
    context: {
      jobId?: string;
      contactId?: string;
      followupId?: string;
      followupType?: string;
      appointmentMode?: string | null;
      taskId?: string;
      outreachId?: string;
    };
    ctaLink: string;
  }>;
  weeklySnapshot: {
    cvsSent: number;
    outreach: number;
    followUpsCompleted: number;
    eventsAttended: number;
    boostTasksDone: number;
  };
  notifications: Array<{
    severity: DashboardNotificationSeverity;
    text: string;
    ctaLink: string | null;
  }>;
};

export type DashboardSummaryMeta = {
  cache: 'hit' | 'miss';
  degraded: boolean;
};

export type DashboardSummaryResult = {
  summary: DashboardSummary;
  meta: DashboardSummaryMeta;
};

const CACHE_WINDOW_MS = 30_000;
const REFRESH_INTERVAL_MS = 60_000;

export const useDashboardSummary = (params?: { enabled?: boolean; force?: boolean }) => {
  const api = useApi();
  const enabled = params?.enabled ?? true;

  return useQuery({
    queryKey: ['dashboard', 'summary', params?.force ? 'force' : 'default'],
    queryFn: async (): Promise<DashboardSummaryResult> => {
      const response = await api.get<DashboardSummary>('/dashboard/summary', {
        params: params?.force ? { force: 'true' } : undefined
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
    enabled,
    staleTime: CACHE_WINDOW_MS,
    gcTime: CACHE_WINDOW_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: 1
  });
};
