import { ResponsiveContainer, BarChart, XAxis, Tooltip, Bar } from 'recharts';
import type { WeeklySummaryResponse } from '../../api/useStats';

type Props = {
  data?: WeeklySummaryResponse['series']['cvsSent'];
  loading?: boolean;
};

const Skeleton = () => (
  <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-10 animate-pulse rounded bg-slate-200" />
    </div>
    <div className="h-full w-full animate-pulse rounded bg-slate-100" />
  </div>
);

export const ChartCvsSent = ({ data, loading }: Props) => {
  if (loading) {
    return <Skeleton />;
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span>Tailored CVs</span>
        <span>Goal ≥ 5/day</span>
      </div>
      <div className="mt-2 flex-1">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <XAxis
                dataKey="d"
                tickFormatter={(value) => formatLabel(value)}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
                labelFormatter={(value) => formatTooltip(value)}
                formatter={(value: number) => [`${value}`, 'CVs'] as const}
              />
              <Bar dataKey="v" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No CVs logged in this period." />
        )}
      </div>
    </div>
  );
};

const formatLabel = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const formatTooltip = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
    {message}
  </div>
);
