import { useQuery } from '@tanstack/react-query';
import { useApi } from './ApiProvider';

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

export const useWeeklySummary = (range: 7 | 14 | 30) => {
  const api = useApi();
  return useQuery({
    queryKey: ['stats', 'weekly', range],
    queryFn: async () => {
      const { data } = await api.get<WeeklySummaryResponse>('/stats/weekly-summary', {
        params: { range }
      });
      return data;
    },
    staleTime: 30_000,
    gcTime: 30_000,
    refetchInterval: 60_000,
    retry: 1
  });
};
