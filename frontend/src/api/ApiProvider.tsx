import { AxiosError } from 'axios';
import axios from 'axios';
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useSessionStore } from '../stores/session';

const ApiContext = createContext(axios.create());

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const token = useSessionStore((state) => state.token);
  const clear = useSessionStore((state) => state.clear);

  const client = useMemo(() => {
    const instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL ?? '/api'
    });

    instance.interceptors.request.use((config) => {
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`
        };
      }
      return config;
    });

    instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          clear();
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [token, clear]);

  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
};

export const useApi = () => useContext(ApiContext);
