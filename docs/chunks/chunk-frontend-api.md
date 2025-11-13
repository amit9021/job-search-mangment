---
id: chunk-frontend-api
title: Frontend · API Layer
module: frontend-api
generated_at: 2025-11-13T07:15:08.035Z
tags: ["client","ui"]
source_paths: ["frontend/src/api/client.ts","frontend/src/api/hooks.ts","frontend/src/api/useDashboard.ts","frontend/src/api/useStats.ts"]
exports: ["API_BASE_URL","BoostSuggestion","CreateJobMutationInput","DashboardActionSuggestion","DashboardNotificationSeverity","DashboardQueueItemType","DashboardSummaryResponse","DashboardSummaryResult","DeleteJobMutationInput","GrowthBoostTask","GrowthEvent","GrowthReview","JobOutreachPayload","ParsedApiError","ProjectHighlight","StatsSeriesPoint","TaskModel","TaskQuickParseResult","TaskQuickParseSuggestion","TaskView","WeeklySummaryResponse","createApiClient","parseApiError","useBoostSuggestionsMutation","useBoostsQuery","useCompaniesQuery","useContactDetailQuery","useContactSearchQuery","useContactsQuery","useCreateCompanyMutation","useCreateContactMutation","useCreateGrowthBoostTaskMutation","useCreateGrowthEventMutation","useCreateGrowthReviewMutation","useCreateJobMutation","useCreateJobOutreachMutation","useCreateProjectHighlightMutation","useDashboardSummary","useDeleteContactMutation","useDeleteJobMutation","useDeleteOutreachMutation","useEventsQuery","useFollowupsQuery","useJobDetailQuery","useJobHeatExplainQuery","useJobHistoryQuery","useJobSearchQuery","useJobsQuery","useKpiTodayQuery","useKpiWeekQuery","useMarkFollowupMutation","useNetworkStarsQuery","useNextActionQuery","useNotificationsQuery","useProjectsQuery","useReviewsQuery","useTaskCreateMutation","useTaskDeleteMutation","useTaskKpisQuery","useTaskQuickParseMutation","useTaskSnoozeMutation","useTaskUpdateMutation","useTasksQuery","useUpdateContactMutation","useUpdateGrowthBoostTaskMutation","useUpdateJobMutation","useUpdateJobStageMutation","useUpdateOutreachMutation","useUpdateProjectHighlightMutation","useWeeklySummary"]
imports: ["../components/ToastProvider","./ApiProvider","@tanstack/react-query","axios"]
tokens_est: 814
---

### Summary
- Axios client with auth interceptor plus React Query hooks for dashboard/stats/KPIs.

### Key API / Logic

### Operational Notes

**Invariants**
- All hooks call createApiClient through ApiProvider to guarantee headers.
- Unauthorized responses trigger session clearing.

**Failure modes**
- Missing token leads to 401 loops unless onUnauthorized resets state.
- Environment variable VITE_API_URL must include protocol.

**Extension tips**
- Define new typed hooks in frontend/src/api/hooks.ts to keep caching consistent.
- Share DTO types with backend via generated types if duplication grows.

#### frontend/src/api/client.ts

```ts

```

#### frontend/src/api/hooks.ts

```ts
export type ParsedApiError = {
  message: string;
  description?: string;
  fieldErrors?: Record<string, string[]>;
};

export type CreateJobMutationInput = {
  company: string;
  role: string;
  sourceUrl?: string;
  heat?: number;
  initialApplication?: {
    tailoringScore: number;
    cvVersionId?: string;
    dateSent?: string;
  };
  initialOutreach?: {
    contactId?: string;
    contactCreate?: {
      name: string;
      role?: string;
      email?: string;
      linkedinUrl?: string;
      companyName?: string;
    };
    channel: string;
    messageType: string;
    personalizationScore: number;
    outcome?: string;
    content?: string;
    context?: string;
    createFollowUp?: boolean;
    followUpNote?: string;
  };
};

export type DeleteJobMutationInput = {
  id: string;
  hard?: boolean;
};

export type JobOutreachPayload = {
  jobId: string;
  contactId?: string;
  contactCreate?: {
    name: string;
    role?: string;
    email?: string;
    linkedinUrl?: string;
    companyName?: string;
  };
  channel: string;
  messageType: string;
  personalizationScore?: number;
  outcome?: string;
  content?: string;
  context?: string;
  createFollowUp?: boolean;
  followUpNote?: string;
};

export type GrowthReview = {
  id: string;
  reviewerId: string;
  projectName: string;
  summary: string;
  score: number;
  reviewedAt: string;
  takeaways?: string | null;
  contact?: {
    id: string;
    name: string | null;
    role?: string | null;
    company?: { id: string; name: string } | null;
  } | null;
};

export type GrowthEvent = {
  id: string;
  name: string;
  date: string;
  location?: string | null;
  attended: boolean;
  notes?: string | null;
  followUps: string[];
  createdAt: string;
  updatedAt: string;
};

export type GrowthBoostTask = {
  id: string;
  title: string;
  description?: string | null;
  category: 'skills-gap' | 'visibility-gap' | 'network-gap';
  impactLevel: number;
  tags: string[];
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type ProjectHighlight = {
  id: string;
  projectName: string;
  platformUrl?: string | null;
  spotlight: boolean;
  plannedPost?: string | null;
  published: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoostSuggestion = {
  title: string;
  description?: string | null;
  category: 'skills-gap' | 'visibility-gap' | 'network-gap';
  impactLevel: number;
  tags?: string[];
};

export type TaskView = 'today' | 'upcoming' | 'backlog' | 'completed';

export type TaskModel = {
  id: string;
  title: string;
  description?: string | null;
  status: 'Todo' | 'Doing' | 'Done' | 'Blocked';
  priority: 'Low' | 'Med' | 'High';
  tags: string[];
  dueAt?: string | null;
  startAt?: string | null;
  recurrence?: string | null;
  source: string;
  checklist: Array<{ text: string; done: boolean }>;
  createdAt: string;
  completedAt?: string | null;
  links: {
    jobId?: string;
    contactId?: string;
    growType?: string;
    growId?: string;
    outreachId?: string;
  };
  context: {
    job?: { id: string; company: string; role: string | null } | null;
    contact?: { id: string; name: string | null } | null;
    grow?: { type: string; id?: string | null } | null;
  };
};

export type TaskQuickParseSuggestion = {
  kind: 'job' | 'contact';
  query: string;
  matches: Array<{ id: string; label: string }>;
};

export type TaskQuickParseResult = {
  title: string;
  tags: string[];
  priority?: 'Low' | 'Med' | 'High';
  dueAt?: string | null;
  recurrence?: string | null;
  links: Record<string, string | undefined>;
  contexts: {
    jobQuery?: string;
    contactQuery?: string;
    growType?: string;
    growRef?: string;
  };
  suggestions: TaskQuickParseSuggestion[];
};
```

#### frontend/src/api/useDashboard.ts

```ts
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
  }>;
};

export type DashboardSummaryResult = {
  summary: DashboardSummaryResponse;
  meta: DashboardSummaryMeta;
};
```

#### frontend/src/api/useStats.ts

```ts
export type StatsSeriesPoint = { d: string; v: number };

export type WeeklySummaryResponse = {
  range: number;
  series: {
    cvsSent: StatsSeriesPoint[];
    warmOutreach: StatsSeriesPoint[];
    followupsDone: StatsSeriesPoint[];
    followupsDue: StatsSeriesPoint[];
  };
  heat: {
    h0: number;
    h1: number;
    h2: number;
    h3: number;
    delta: { h0: number; h1: number; h2: number; h3: number };
  };
  degraded: boolean;
};
```

### Related
- [chunk-frontend-dashboard](./chunk-frontend-dashboard.md)
- [chunk-frontend-shell](./chunk-frontend-shell.md)
