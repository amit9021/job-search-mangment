import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { z } from 'zod';
import { useApi } from './ApiProvider';
import { useSessionStore } from '../stores/session';
import { useToast } from '../components/ToastProvider';

const loginSchema = z.object({
  token: z.string(),
  expiresIn: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string()
  })
});

export type ParsedApiError = {
  message: string;
  description?: string;
  fieldErrors?: Record<string, string[]>;
};

export const parseApiError = (error: unknown): ParsedApiError => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    const details = (data?.details ?? {}) as Record<string, unknown>;
    const errors = (details?.errors ?? {}) as Record<string, unknown>;
    const fieldErrors = (errors?.fieldErrors ?? {}) as Record<string, string[]>;

    let description: string | undefined;
    const rawFormErrors = errors?.formErrors as unknown;
    const formErrors = Array.isArray(rawFormErrors)
      ? (rawFormErrors as Array<string | undefined>).filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];

    if (formErrors.length > 0) {
      description = formErrors.join(', ');
    } else if (typeof details?.message === 'string') {
      description = details.message;
    } else if (typeof details === 'string') {
      description = details;
    }

    const message = typeof data?.message === 'string' ? data.message : error.message ?? 'Request failed';

    return {
      message,
      description,
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
    };
  }

  return { message: 'Unexpected error', description: undefined };
};

const getErrorToastContent = (parsed: ParsedApiError) => ({
  title: parsed.message,
  description: parsed.description
});

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
    createFollowUp?: boolean;
    followUpNote?: string;
  };
};

export type DeleteJobMutationInput = {
  id: string;
  hard?: boolean;
};

export const useLoginMutation = () => {
  const api = useApi();
  const setSession = useSessionStore((state) => state.setSession);
  return useMutation({
    mutationFn: async (payload: { username: string; password: string }) => {
      const response = await api.post('/auth/login', payload);
      const parsed = loginSchema.parse(response.data);
      setSession({ token: parsed.token, user: parsed.user });
      return parsed;
    }
  });
};

export const useKpiTodayQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['kpis', 'today'],
    queryFn: async () => {
      const { data } = await api.get('/kpis/today');
      return data as {
        cvSentToday: number;
        cvTarget: number;
        outreachToday: number;
        outreachTarget: number;
        followupsDue: number;
        seniorReviewsThisWeek: number;
        heatBreakdown: Array<{ heat: number; count: number }>;
        nextBestAction?: { title: string; action: string; ref?: Record<string, unknown> };
      };
    }
  });
};

export const useKpiWeekQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['kpis', 'week'],
    queryFn: async () => {
      const { data } = await api.get('/kpis/week');
      return data as {
        cvSent: number;
        outreach: number;
        followupsSent: number;
        eventsAttended: number;
        boostTasksDone: number;
      };
    }
  });
};

export const useJobsQuery = (filters?: {
  stage?: string;
  heat?: number;
  includeArchived?: boolean;
  query?: string;
  page?: number;
  pageSize?: number;
}) => {
  const api = useApi();
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const params = filters
        ? {
            stage: filters.stage,
            heat: filters.heat,
            includeArchived: filters.includeArchived ? 'true' : undefined,
            query: filters.query && filters.query.trim().length > 0 ? filters.query.trim() : undefined,
            page: filters.page,
            pageSize: filters.pageSize
          }
        : undefined;
      const { data } = await api.get('/jobs', { params });
      return data as Array<{
        id: string;
        company: string;
        role: string;
        stage: string;
        heat: number;
        updatedAt: string;
        lastTouchAt: string;
        sourceUrl?: string | null;
        archived: boolean;
        archivedAt?: string | null;
        contactsCount: number;
        contacts: Array<{
          id: string;
          name: string | null;
          role?: string | null;
        }>;
        nextFollowUpAt?: string | null;
      }>;
    }
  });
};

export const useJobDetailQuery = (id: string) => {
  const api = useApi();
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const { data } = await api.get(`/jobs/${id}`);
      return data as {
        id: string;
        company: string;
        role: string;
        stage: string;
        heat: number;
        sourceUrl?: string;
        companyId?: string;
        lastTouchAt: string;
        createdAt: string;
        updatedAt: string;
        archived: boolean;
        archivedAt?: string | null;
        contactsCount: number;
        contacts: Array<{
          id: string;
          name: string | null;
          role?: string | null;
        }>;
        nextFollowUpAt?: string | null;
      };
    },
    enabled: !!id
  });
};

export const useJobHeatExplainQuery = (jobId: string | undefined, options?: { enabled?: boolean }) => {
  const api = useApi();
  return useQuery({
    queryKey: ['jobs', jobId, 'heat-explain'],
    enabled: Boolean(jobId) && (options?.enabled ?? true),
    queryFn: async () => {
      const { data } = await api.get(`/jobs/${jobId}/heat-explain`);
      return data as {
        jobId: string;
        stage: string;
        score: number;
        heat: number;
        breakdown: Array<{
          category: string;
          label: string;
          value: number;
          rawValue?: number;
          note?: string;
        }>;
        decayFactor: number;
        daysSinceLastTouch: number;
        lastTouchAt: string;
        capApplied?: string;
        stageBase: number;
      };
    }
  });
};

export const useCreateJobMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (payload: CreateJobMutationInput) => {
      const { data } = await api.post('/jobs', payload);
      return data as {
        id: string;
        company: string;
        role: string;
        stage: string;
        heat: number;
        archived: boolean;
        contactsCount: number;
        contacts: Array<{
          id: string;
          name: string | null;
          role?: string | null;
        }>;
        nextFollowUpAt?: string | null;
      };
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Job created', `${job.company} added to the pipeline`);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      const { title, description } = getErrorToastContent(parsed);
      toast.error(title, description);
    }
  });
};

export const useUpdateJobMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string;
      company?: string;
      role?: string;
      sourceUrl?: string | null;
      companyId?: string | null;
    }) => {
      const { data } = await api.patch(`/jobs/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    }
  });
};

export const useDeleteJobMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, hard }: DeleteJobMutationInput) => {
      await api.delete(`/jobs/${id}`, {
        params: hard ? { hard: 'true' } : undefined
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.id, 'history'] });
      toast.success(variables.hard ? 'Job deleted' : 'Job archived');
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      const { title, description } = getErrorToastContent(parsed);
      toast.error(title, description);
    }
  });
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

export const useCreateJobOutreachMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ jobId, ...payload }: JobOutreachPayload) => {
      const { data } = await api.post('/outreach', { jobId, ...payload });
      return data as {
        outreach: {
          id: string;
          jobId?: string | null;
          contactId?: string | null;
          channel: string;
          messageType: string;
          personalizationScore: number;
          outcome: string;
          content?: string | null;
          context: string;
          sentAt: string;
          contact?: { id: string; name: string | null } | null;
        };
        job: {
          id: string;
          company: string;
          role: string;
          stage: string;
          heat: number;
          lastTouchAt: string;
          updatedAt: string;
          sourceUrl?: string | null;
          archived: boolean;
          contactsCount: number;
          contacts: Array<{
            id: string;
            name: string | null;
            role?: string | null;
          }>;
          nextFollowUpAt?: string | null;
        };
      };
    },
    onSuccess: (result, variables) => {
      const outreach = result?.outreach;
      const job = result?.job;

      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.jobId, 'history'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });

      const linkedContactId = outreach?.contactId ?? outreach?.contact?.id;
      if (linkedContactId) {
        queryClient.invalidateQueries({ queryKey: ['contacts', linkedContactId] });
      }

      const contactName = outreach?.contact?.name ?? outreach?.contactId ?? 'contact';
      const companyName = job?.company ?? '';
      toast.success(
        'Outreach logged',
        companyName ? `${companyName} ↔ ${contactName}` : `Logged outreach to ${contactName}`
      );
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      const { title, description } = getErrorToastContent(parsed);
      toast.error(title, description);
    }
  });
};

export const useUpdateJobStageMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ jobId, stage, note }: { jobId: string; stage: string; note?: string }) => {
      const { data } = await api.post(`/jobs/${jobId}/status`, { stage, note });
      return data as {
        job: {
          id: string;
          company: string;
          role: string;
          stage: string;
          heat: number;
          lastTouchAt: string;
          updatedAt: string;
          contactsCount: number;
          contacts: Array<{
            id: string;
            name: string | null;
            role?: string | null;
          }>;
          nextFollowUpAt?: string | null;
        };
        history: {
          id: string;
          stage: string;
          at: string;
          note?: string | null;
        };
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.jobId, 'history'] });
      toast.success('Stage updated');
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      const { title, description } = getErrorToastContent(parsed);
      toast.error(title, description);
    }
  });
};

export const useJobHistoryQuery = (id: string, options?: { enabled?: boolean }) => {
  const api = useApi();
  return useQuery({
    queryKey: ['jobs', id, 'history'],
    enabled: !!id && (options?.enabled ?? true),
    queryFn: async () => {
      const { data } = await api.get(`/jobs/${id}/history`);
      return data as {
        id: string;
        company: string;
        role: string;
        stage: string;
        heat: number;
        applications: Array<{
          id: string;
          dateSent: string;
          tailoringScore: number;
          cvVersionId?: string | null;
        }>;
        statusHistory: Array<{
          id: string;
          stage: string;
          at: string;
          note?: string | null;
        }>;
        outreaches: Array<{
          id: string;
          channel: string;
          messageType: string;
          personalizationScore: number;
          outcome: string;
          content?: string | null;
          sentAt: string;
          contact?: { id: string; name: string | null } | null;
        }>;
        followups: Array<{
          id: string;
          dueAt: string;
          sentAt?: string | null;
          attemptNo: number;
          note?: string | null;
          contact?: { id: string; name: string | null; role?: string | null } | null;
        }>;
      };
    }
  });
};

export const useContactsQuery = (filters?: {
  query?: string;
  strength?: string;
  companyId?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
  tags?: string[];
  lastTouch?: '7d' | '30d' | 'stale' | 'never';
}) => {
  const api = useApi();
  const sanitizedFilters = filters
    ? {
        query: filters.query && filters.query.trim().length > 0 ? filters.query.trim() : undefined,
        strength: filters.strength,
        companyId: filters.companyId,
        includeArchived: filters.includeArchived ? true : undefined,
        page: filters.page,
        pageSize: filters.pageSize,
        tags: filters.tags && filters.tags.length > 0 ? [...filters.tags].sort() : undefined,
        lastTouch: filters.lastTouch
      }
    : undefined;

  return useQuery({
    queryKey: ['contacts', sanitizedFilters],
    queryFn: async () => {
      const params = sanitizedFilters
        ? {
            query: sanitizedFilters.query,
            strength: sanitizedFilters.strength,
            companyId: sanitizedFilters.companyId,
            includeArchived: sanitizedFilters.includeArchived ? 'true' : undefined,
            page: sanitizedFilters.page,
            pageSize: sanitizedFilters.pageSize,
            tags: sanitizedFilters.tags ? sanitizedFilters.tags.join(',') : undefined,
            lastTouch: sanitizedFilters.lastTouch
          }
        : undefined;
      const { data } = await api.get('/contacts', { params });
      return data as Array<{
        id: string;
        name: string;
        companyId?: string;
        company?: { id: string; name: string; domain?: string; linkedinUrl?: string };
        role?: string;
        email?: string;
        phone?: string;
        linkedinUrl?: string;
        githubUrl?: string;
        location?: string;
        tags: string[];
        strength: string;
        lastTouchAt: string;
        createdAt: string;
        updatedAt: string;
        archived: boolean;
        archivedAt?: string | null;
        linkedJobs: Array<{
          id: string;
          company: string;
          role: string | null;
          stage: string;
        }>;
        nextFollowUpAt?: string | null;
        engagement?: {
          level: 'cold' | 'warm' | 'hot';
          score?: number | null;
          updatedAt?: string | null;
          reason?: string | null;
        };
      }>;
    }
  });
};

export const useContactSearchQuery = (query: string, options?: { enabled?: boolean; limit?: number }) => {
  const api = useApi();
  return useQuery({
    queryKey: ['contacts', 'search', query, options?.limit],
    enabled: (options?.enabled ?? true) && query.trim().length >= 2,
    queryFn: async () => {
      const { data } = await api.get('/contacts', {
        params: {
          query: query.trim(),
          pageSize: options?.limit ?? 10
        }
      });
      return data as Array<{
        id: string;
        name: string;
        company?: { id: string; name: string };
        role?: string;
        email?: string;
        linkedinUrl?: string;
      }>;
    }
  });
};

export const useJobSearchQuery = (query: string, options?: { enabled?: boolean; limit?: number }) => {
  const api = useApi();
  return useQuery({
    queryKey: ['jobs', 'search', query, options?.limit],
    enabled: (options?.enabled ?? true) && query.trim().length >= 2,
    queryFn: async () => {
      const { data } = await api.get('/jobs', {
        params: {
          query: query.trim(),
          includeArchived: 'false',
          pageSize: options?.limit ?? 10
        }
      });
      return data as Array<{
        id: string;
        company: string;
        role: string;
        stage: string;
        contactsCount: number;
      }>;
    }
  });
};

export const useNetworkStarsQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['contacts', 'stars'],
    queryFn: async () => {
      const { data } = await api.get('/contacts/stars');
      return data as Array<{ id: string; name: string; company?: string; referrals: Array<unknown> }>;
    }
  });
};

export const useFollowupsQuery = (due: 'today' | 'upcoming' | 'overdue' = 'today') => {
  const api = useApi();
  return useQuery({
    queryKey: ['followups', due],
    queryFn: async () => {
      const { data } = await api.get('/followups', { params: { due } });
      return data as Array<{
        id: string;
        dueAt: string;
        attemptNo: number;
        job?: { id: string; company: string };
        contact?: { id: string; name: string };
      }>;
    }
  });
};

export const useNotificationsQuery = (scope: 'today' | 'upcoming' | 'overdue' = 'today') => {
  const api = useApi();
  return useQuery({
    queryKey: ['notifications', scope],
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params: { scope } });
      return data as Array<{
        id: string;
        kind: string;
        message: string;
        dueAt: string;
      }>;
    }
  });
};

export const useMarkFollowupMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      await api.patch(`/followups/${id}/send`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
};

export const useNextActionQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['recommendations', 'next'],
    queryFn: async () => {
      const { data } = await api.get('/recommendations/next');
      return data as { title: string; action: string; ref?: Record<string, unknown> };
    }
  });
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

export const useReviewsQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['grow', 'reviews'],
    queryFn: async () => {
      const { data } = await api.get('/grow/reviews');
      return data as GrowthReview[];
    }
  });
};

export const useEventsQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['grow', 'events'],
    queryFn: async () => {
      const { data } = await api.get('/grow/events');
      return data as GrowthEvent[];
    }
  });
};

export const useBoostsQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['grow', 'boost'],
    queryFn: async () => {
      const { data } = await api.get('/grow/boost');
      return data as GrowthBoostTask[];
    }
  });
};

export const useProjectsQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['grow', 'projects'],
    queryFn: async () => {
      const { data } = await api.get('/grow/projects');
      return data as ProjectHighlight[];
    }
  });
};

export const useCreateGrowthReviewMutation = () => {
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { reviewerId: string; projectName: string; summary: string; score: number; takeaways?: string }) => {
      const { data } = await api.post('/grow/reviews', payload);
      return data as GrowthReview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grow', 'reviews'] });
      toast.add({ title: 'Review logged', description: 'Senior review saved successfully.' });
    },
    onError: (error) => {
      toast.add(getErrorToastContent(parseApiError(error)));
    }
  });
};

export const useCreateGrowthEventMutation = () => {
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      date: Date | string;
      location?: string;
      attended?: boolean;
      notes?: string;
      followUps?: string[];
    }) => {
      const { data } = await api.post('/grow/events', {
        ...payload,
        date: payload.date instanceof Date ? payload.date.toISOString() : payload.date
      });
      return data as GrowthEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grow', 'events'] });
      toast.add({ title: 'Event saved', description: 'Growth event added to your tracker.' });
    },
    onError: (error) => {
      toast.add(getErrorToastContent(parseApiError(error)));
    }
  });
};

export const useCreateGrowthBoostTaskMutation = () => {
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      category: 'skills-gap' | 'visibility-gap' | 'network-gap';
      impactLevel: number;
      tags?: string[];
      status?: 'pending' | 'in-progress' | 'completed';
    }) => {
      const { data } = await api.post('/grow/boost', payload);
      return data as GrowthBoostTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grow', 'boost'] });
      toast.add({ title: 'Boost task added', description: 'Boost task is now in your queue.' });
    },
    onError: (error) => {
      toast.add(getErrorToastContent(parseApiError(error)));
    }
  });
};

export const useUpdateGrowthBoostTaskMutation = () => {
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: Partial<{
        title: string;
        description: string | null;
        category: 'skills-gap' | 'visibility-gap' | 'network-gap';
        impactLevel: number;
        tags: string[];
        status: 'pending' | 'in-progress' | 'completed';
      }>;
    }) => {
      const { data: response } = await api.patch(`/grow/boost/${id}`, data);
      return response as GrowthBoostTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grow', 'boost'] });
      toast.add({ title: 'Boost task updated', description: 'Task status synced.' });
    },
    onError: (error) => {
      toast.add(getErrorToastContent(parseApiError(error)));
    }
  });
};

export const useCreateProjectHighlightMutation = () => {
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      projectName: string;
      platformUrl?: string;
      spotlight?: boolean;
      plannedPost?: string;
      published?: boolean;
      publishedAt?: Date | string;
    }) => {
      const { data } = await api.post('/grow/projects', {
        ...payload,
        publishedAt:
          payload.publishedAt instanceof Date ? payload.publishedAt.toISOString() : payload.publishedAt
      });
      return data as ProjectHighlight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grow', 'projects'] });
      toast.add({ title: 'Project highlight added', description: 'Visibility spotlight saved.' });
    },
    onError: (error) => {
      toast.add(getErrorToastContent(parseApiError(error)));
    }
  });
};

export const useUpdateProjectHighlightMutation = () => {
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: Partial<{
        projectName: string;
        platformUrl: string | null;
        spotlight: boolean;
        plannedPost: string | null;
        published: boolean;
        publishedAt: Date | string | null;
      }>;
    }) => {
      const payload = {
        ...data,
        ...(data.publishedAt !== undefined && {
          publishedAt:
            data.publishedAt instanceof Date
              ? data.publishedAt.toISOString()
              : data.publishedAt
        })
      };
      const { data: response } = await api.patch(`/grow/projects/${id}`, payload);
      return response as ProjectHighlight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grow', 'projects'] });
      toast.add({ title: 'Project highlight updated', description: 'Spotlight details refreshed.' });
    },
    onError: (error) => {
      toast.add(getErrorToastContent(parseApiError(error)));
    }
  });
};

export const useBoostSuggestionsMutation = () => {
  const api = useApi();
  const toast = useToast();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/grow/boost/suggest');
      return data as BoostSuggestion[];
    },
    onError: (error) => {
      toast.add(getErrorToastContent(parseApiError(error)));
    }
  });
};

// ==================== Companies API ====================

export const useCompaniesQuery = (query?: string) => {
  const api = useApi();
  return useQuery({
    queryKey: ['companies', query],
    queryFn: async () => {
      const { data } = await api.get('/companies', { params: { query } });
      return data as Array<{
        id: string;
        name: string;
        domain?: string;
        linkedinUrl?: string;
        createdAt: string;
        updatedAt: string;
      }>;
    },
    enabled: query !== undefined && query.length > 0
  });
};

export const useCreateCompanyMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; domain?: string; linkedinUrl?: string }) => {
      const { data } = await api.post('/companies', payload);
      return data as { id: string; name: string; domain?: string; linkedinUrl?: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    }
  });
};

// ==================== Enhanced Contacts API ====================

export const useContactDetailQuery = (id: string) => {
  const api = useApi();
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const { data } = await api.get(`/contacts/${id}`);
      return data as {
        id: string;
        name: string;
        companyId?: string;
        company?: { id: string; name: string; domain?: string; linkedinUrl?: string };
        role?: string;
        email?: string;
        phone?: string;
        linkedinUrl?: string;
        githubUrl?: string;
        location?: string;
        tags: string[];
        notes?: string;
        strength: string;
        createdAt: string;
        updatedAt: string;
        lastTouchAt: string;
        nextFollowUpAt?: string | null;
        engagement?: {
          level: 'cold' | 'warm' | 'hot';
          score?: number | null;
          updatedAt?: string | null;
          reason?: string | null;
        };
        timeline: Array<{
          type: 'outreach' | 'referral' | 'review' | 'followup';
          date: string;
          data: any;
        }>;
        linkedJobs: Array<{
          id: string;
          company: string;
          role: string | null;
          stage: string;
        }>;
      };
    },
    enabled: !!id
  });
};

export const useCreateContactMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      companyId?: string;
      companyName?: string;
      role?: string;
      email?: string;
      phone?: string;
      linkedinUrl?: string;
      githubUrl?: string;
      location?: string;
      tags?: string[];
      notes?: string;
      strength?: string;
    }) => {
      const { data } = await api.post('/contacts', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
};

export const useDeleteContactMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, hard }: { id: string; hard?: boolean }) => {
      await api.delete(`/contacts/${id}`, {
        params: hard ? { hard: 'true' } : undefined
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.id] });
      toast.success(variables.hard ? 'Contact deleted' : 'Contact archived');
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      const { title, description } = getErrorToastContent(parsed);
      toast.error(title, description);
    }
  });
};

export const useUpdateContactMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string;
      name?: string;
      companyId?: string | null;
      companyName?: string;
      role?: string | null;
      email?: string | null;
      phone?: string | null;
      linkedinUrl?: string | null;
      githubUrl?: string | null;
      location?: string | null;
      tags?: string[];
      notes?: string | null;
      strength?: string;
    }) => {
      const { data } = await api.patch(`/contacts/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.id] });
    }
  });
};

export const useUpdateOutreachMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      context?: string;
      outcome?: string;
      content?: string;
      messageType?: string;
      personalizationScore?: number;
    }) => {
      const { id, ...rest } = payload;
      const { data } = await api.patch(`/outreach/${id}`, rest);
      return data as {
        id: string;
        job?: { id: string } | null;
        contact?: { id: string } | null;
        context: string;
      };
    },
    onSuccess: (result) => {
      if (result.contact?.id) {
        queryClient.invalidateQueries({ queryKey: ['contacts', result.contact.id] });
      }
      if (result.job?.id) {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['jobs', result.job.id] });
        queryClient.invalidateQueries({ queryKey: ['jobs', result.job.id, 'history'] });
        queryClient.invalidateQueries({ queryKey: ['jobs', result.job.id, 'heat-explain'] });
      }
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Outreach updated');
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      const { title, description } = getErrorToastContent(parsed);
      toast.error(title, description);
    }
  });
};

export const useDeleteOutreachMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data } = await api.delete(`/outreach/${id}`);
      return data as {
        deletedId: string;
        jobId?: string | null;
        contactId?: string | null;
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      if (result.jobId) {
        queryClient.invalidateQueries({ queryKey: ['jobs', result.jobId] });
        queryClient.invalidateQueries({ queryKey: ['jobs', result.jobId, 'history'] });
        queryClient.invalidateQueries({ queryKey: ['jobs', result.jobId, 'heat-explain'] });
      }
      if (result.contactId) {
        queryClient.invalidateQueries({ queryKey: ['contacts', result.contactId] });
      }
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Outreach removed');
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      const { title, description } = getErrorToastContent(parsed);
      toast.error(title, description);
    }
  });
};
