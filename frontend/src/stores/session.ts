import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
};

interface SessionState {
  token: string | null;
  expiresAt: number | null;
  user: SessionUser | null;
  setSession: (payload: { token: string; exp: number }) => void;
  setUser: (user: SessionUser | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      expiresAt: null,
      user: null,
      setSession: ({ token, exp }) => set({ token, expiresAt: exp * 1000 }),
      setUser: (user) => set({ user }),
      clear: () => set({ token: null, user: null, expiresAt: null })
    }),
    {
      name: 'job-hunt-auth'
    }
  )
);
