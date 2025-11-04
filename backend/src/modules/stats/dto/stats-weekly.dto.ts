export type StatsSeriesPoint = { d: string; v: number };

export type StatsWeeklySummaryDto = {
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
    delta: {
      h0: number;
      h1: number;
      h2: number;
      h3: number;
    };
  };
  degraded: boolean;
};
