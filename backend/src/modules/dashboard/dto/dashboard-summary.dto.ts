export type DashboardActionSuggestion = 'follow_up' | 'send_outreach' | 'apply' | 'review';

export type DashboardQueueItemType = 'follow_up' | 'task' | 'stale_outreach';

export type DashboardNotificationSeverity = 'high' | 'med' | 'low';

export interface DashboardJobReference {
  id: string;
  company: string;
  role: string;
  heat: number;
}

export interface DashboardNextBestAction {
  title: string;
  reason: string;
  suggestedAction: DashboardActionSuggestion;
  job: DashboardJobReference | null;
  ctaLink: string;
}

export interface DashboardQueueItem {
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
}

export interface DashboardNotification {
  severity: DashboardNotificationSeverity;
  text: string;
  ctaLink: string | null;
}

export interface DashboardSummaryDto {
  kpis: {
    tailoredCvs: { sentToday: number; targetDaily: number; spark: number[] };
    outreach: { sentToday: number; targetDaily: number; spark: number[] };
    followUpsDue: number;
    seniorReviewsThisWeek: number;
  };
  nextBestAction: DashboardNextBestAction;
  notifications: DashboardNotification[];
  todayQueue: DashboardQueueItem[];
}

export interface DashboardSummaryWithMeta {
  payload: DashboardSummaryDto;
  degraded: boolean;
  cacheHit: boolean;
}
