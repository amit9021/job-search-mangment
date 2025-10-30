import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './ApiProvider';
import { useSessionStore } from '../stores/session';
import { z } from 'zod';

const loginSchema = z.object({
  token: z.string(),
  expiresIn: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string()
  })
});

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

export const useJobsQuery = (filters?: { stage?: string; heat?: number }) => {
  const api = useApi();
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const { data } = await api.get('/jobs', { params: filters });
      return data as Array<{
        id: string;
        company: string;
        role: string;
        stage: string;
        heat: number;
        updatedAt: string;
        lastTouchAt: string;
      }>;
    }
  });
};

export const useCreateJobMutation = () => {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      company: string;
      role: string;
      sourceUrl?: string;
      deadline?: string;
      initialApplication?: {
        tailoringScore: number;
        cvVersionId?: string;
        dateSent?: string;
      };
      initialOutreach?: {
        contactId?: string;
        channel: string;
        messageType: string;
        personalizationScore: number;
        outcome?: string;
        content?: string;
      };
    }) => {
      await api.post('/jobs', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    }
  });
};

export const useContactsQuery = (filters?: {
  query?: string;
  strength?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
}) => {
  const api = useApi();
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: async () => {
      const { data } = await api.get('/contacts', { params: filters });
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

export const useReviewsQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const { data } = await api.get('/reviews');
      return data as Array<{ id: string; project: { name: string }; contact: { name: string }; qualityScore?: number }>;
    }
  });
};

export const useEventsQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data } = await api.get('/events');
      return data as Array<{
        id: string;
        name: string;
        date: string;
        status: string;
        location?: string;
      }>;
    }
  });
};

export const useBoostsQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['boosts'],
    queryFn: async () => {
      const { data } = await api.get('/boosts');
      return data as Array<{ id: string; title: string; impactScore: number; doneAt?: string }>;
    }
  });
};

export const useProjectsQuery = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data as Array<{ id: string; name: string; repoUrl: string; stack?: string; spotlight: boolean }>;
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
        timeline: Array<{
          type: 'outreach' | 'referral' | 'review';
          date: string;
          data: any;
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
