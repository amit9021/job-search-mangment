import { AxiosInstance } from 'axios';
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useSessionStore } from '../stores/session';
import { createApiClient } from './client';

const ApiContext = createContext<AxiosInstance>(createApiClient());

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const token = useSessionStore((state) => state.token);
  const clear = useSessionStore((state) => state.clear);

  const client = useMemo(
    () =>
      createApiClient({
        token,
        onUnauthorized: clear
      }),
    [token, clear]
  );

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
};

export const useApi = () => useContext(ApiContext);
