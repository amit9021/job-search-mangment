import axios, { AxiosError, AxiosInstance } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type CreateClientOptions = {
  token?: string | null;
  onUnauthorized?: () => void;
};

export const createApiClient = ({ token, onUnauthorized }: CreateClientOptions = {}): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
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
        onUnauthorized?.();
      }
      return Promise.reject(error);
    }
  );

  return instance;
};
