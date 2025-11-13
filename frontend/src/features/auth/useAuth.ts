import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { useApi } from '../../api/ApiProvider';
import { parseApiError } from '../../api/hooks';
import { useToast } from '../../components/ToastProvider';
import { useSessionStore, type SessionUser } from '../../stores/session';

const loginResponseSchema = z.object({
  accessToken: z.string(),
  exp: z.number()
});

const meSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.string()
});

const registerResponseSchema = meSchema;

const decodeJwtPayload = (token: string) => {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }
  try {
    const payload = segments[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const globalScope = globalThis as Record<string, unknown>;
    const hasAtob = typeof globalScope.atob === 'function';
    const raw = hasAtob
      ? (globalScope.atob as (input: string) => string)(padded)
      : typeof globalScope.Buffer === 'function'
        ? (globalScope.Buffer as unknown as { from: (value: string, encoding: string) => { toString: (encoding: string) => string } })
            .from(padded, 'base64')
            .toString('utf-8')
        : '';
    return JSON.parse(raw) as { exp?: number };
  } catch {
    return null;
  }
};

export const useAuth = () => {
  const api = useApi();
  const toast = useToast();
  const queryClient = useQueryClient();

  const token = useSessionStore((state) => state.token);
  const expiresAt = useSessionStore((state) => state.expiresAt);
  const user = useSessionStore((state) => state.user);
  const setSession = useSessionStore((state) => state.setSession);
  const setUser = useSessionStore((state) => state.setUser);
  const clear = useSessionStore((state) => state.clear);

  useEffect(() => {
    if (!token) {
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload?.exp || payload.exp * 1000 <= Date.now()) {
      clear();
      setUser(null);
    }
  }, [token, clear, setUser]);

  useEffect(() => {
    if (expiresAt && expiresAt <= Date.now()) {
      clear();
      setUser(null);
    }
  }, [expiresAt, clear, setUser]);

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      const parsed = meSchema.parse(data);
      setUser(parsed);
      return parsed;
    }
  });

  useEffect(() => {
    if (meQuery.isError) {
      clear();
      setUser(null);
    }
  }, [meQuery.isError, clear, setUser]);

  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await api.post('/auth/login', payload);
      return loginResponseSchema.parse(data);
    },
    onSuccess: (data) => {
      setSession({ token: data.accessToken, exp: data.exp });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.add({ title: parsed.message, description: parsed.description, variant: 'error' });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await api.post('/auth/register', payload);
      return registerResponseSchema.parse(data);
    },
    onSuccess: (profile) => {
      toast.success('Account created', `Welcome aboard, ${profile.email}. You can sign in now.`);
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.add({ title: parsed.message, description: parsed.description, variant: 'error' });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onError: (error) => {
      const parsed = parseApiError(error);
      toast.add({ title: parsed.message, description: parsed.description, variant: 'error' });
    },
    onSettled: () => {
      clear();
      setUser(null);
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
    }
  });

  const resolvedUser = user ?? (meQuery.data as SessionUser | undefined) ?? null;
  const hasToken = Boolean(token);

  const authState = useMemo(
    () => ({
      isAuthenticated: Boolean(hasToken && resolvedUser),
      isLoading: Boolean(hasToken) && meQuery.isLoading,
      token
    }),
    [hasToken, resolvedUser, meQuery.isLoading, token]
  );

  return {
    ...authState,
    user: resolvedUser,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginStatus: loginMutation.status,
    registerStatus: registerMutation.status,
    logoutStatus: logoutMutation.status
  };
};
