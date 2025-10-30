import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SessionUser = {
  id: string;
  username: string;
};

interface SessionState {
  token: string | null;
  user: SessionUser | null;
  setSession: (payload: { token: string; user: SessionUser }) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => set({ token, user }),
      clear: () => set({ token: null, user: null })
    }),
    {
      name: 'job-hunt-session'
    }
  )
);
