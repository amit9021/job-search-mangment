import type { DashboardSummary } from '../../api/dashboard';

type WeeklySnapshotProps = {
  snapshot?: DashboardSummary['weeklySnapshot'];
  loading?: boolean;
};

const metrics = [
  { key: 'cvsSent', label: 'CVs sent', helper: 'Tailored applications over the last 7 days.' },
  { key: 'outreach', label: 'Warm outreach', helper: 'Relationship-building touches in the past week.' },
  { key: 'followUpsCompleted', label: 'Follow-ups completed', helper: 'Follow-ups marked done in the last 7 days.' },
  { key: 'eventsAttended', label: 'Events attended', helper: 'Events and workshops engaged this week.' },
  { key: 'boostTasksDone', label: 'Boost tasks done', helper: 'Growth boosts completed in the last 7 days.' }
] as const;

const SkeletonRow = () => (
  <li className="flex flex-col gap-1 border-b border-slate-100 py-2 last:border-b-0">
    <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
    <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
  </li>
);

export const WeeklySnapshot = ({ snapshot, loading }: WeeklySnapshotProps) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Weekly snapshot</h3>
        <ul className="mt-3 space-y-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ul>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <h3 className="text-base font-semibold text-slate-700">No activity recorded yet</h3>
        <p className="mt-2">Log your latest outreach, events, and follow-ups to build your weekly momentum snapshot.</p>
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...metrics.map((metric) => snapshot[metric.key] ?? 0)
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Weekly snapshot</h3>
      <ul className="mt-3 space-y-3">
        {metrics.map((metric) => (
          <li key={metric.key} className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{metric.label}</p>
                <span className="text-sm font-semibold text-slate-900">{snapshot[metric.key]}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-400"
                  style={{
                    width: `${Math.min(100, Math.round(((snapshot[metric.key] ?? 0) / maxValue) * 100))}%`
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{metric.helper}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
