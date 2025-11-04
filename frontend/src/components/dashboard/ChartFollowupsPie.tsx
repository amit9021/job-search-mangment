import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { WeeklySummaryResponse } from '../../api/useStats';

type Props = {
  doneSeries?: WeeklySummaryResponse['series']['followupsDone'];
  dueSeries?: WeeklySummaryResponse['series']['followupsDue'];
  loading?: boolean;
};

const COLORS = ['#22c55e', '#f97316'];

const Skeleton = () => (
  <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
    <div className="h-40 w-full animate-pulse rounded-full bg-slate-100" />
  </div>
);

export const ChartFollowupsPie = ({ doneSeries, dueSeries, loading }: Props) => {
  if (loading) {
    return <Skeleton />;
  }

  const done = sumSeries(doneSeries);
  const due = sumSeries(dueSeries);
  const total = done + due;
  const data = [
    { name: 'Completed', value: done },
    { name: 'Due & Overdue', value: due }
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-700">Follow-ups status</p>
        <p className="text-xs text-slate-400">Completed vs due across the selected range.</p>
      </div>
      <div className="mt-2 flex flex-1 items-center justify-center">
        {total === 0 ? (
          <EmptyState message="No follow-ups recorded." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={3}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value}`, name]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
          <span className="font-semibold">{done}</span> completed
        </div>
        <div className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
          <span className="font-semibold">{due}</span> due / overdue
        </div>
      </div>
    </div>
  );
};

const sumSeries = (series?: { v: number }[]) => {
  if (!series) return 0;
  return series.reduce((acc, point) => acc + point.v, 0);
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-full items-center justify-center text-xs text-slate-400">{message}</div>
);
