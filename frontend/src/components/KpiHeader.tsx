import { differenceInCalendarDays } from 'date-fns';
import { useMemo } from 'react';

type KpiJob = {
  id: string;
  stage: string;
  heat: number;
  archived: boolean;
  nextFollowUpAt?: string | null;
};

const archivedStages = new Set(['REJECTED', 'DORMANT']);

const tiles: Array<{
  id: 'active' | 'hot' | 'followups' | 'avgHeat';
  label: string;
  accent: string;
  icon: string;
}> = [
  { id: 'active', label: 'Active jobs', accent: 'bg-blue-100 text-blue-700', icon: '📂' },
  { id: 'hot', label: 'Hot jobs', accent: 'bg-amber-100 text-amber-700', icon: '🔥' },
  { id: 'followups', label: 'Follow-ups today', accent: 'bg-emerald-100 text-emerald-700', icon: '⏰' },
  { id: 'avgHeat', label: 'Average heat', accent: 'bg-rose-100 text-rose-700', icon: '🌡️' }
];

export const KpiHeader = ({ jobs }: { jobs: KpiJob[] }) => {
  const metrics = useMemo(() => {
    const active = jobs.filter((job) => !job.archived && !archivedStages.has(job.stage));
    const activeCount = active.length;

    const hotCount = active.filter((job) => job.heat >= 2).length;

    const today = new Date();
    const followupsDueToday = active.filter((job) => {
      if (!job.nextFollowUpAt) {
        return false;
      }
      const due = new Date(job.nextFollowUpAt);
      if (Number.isNaN(due.getTime())) {
        return false;
      }
      return differenceInCalendarDays(due, today) === 0;
    }).length;

    const avgHeat =
      activeCount === 0
        ? 0
        : active.reduce((total, job) => total + (Number.isFinite(job.heat) ? job.heat : 0), 0) /
          activeCount;

    return {
      activeCount,
      hotCount,
      followupsDueToday,
      avgHeat: Number.isFinite(avgHeat) ? avgHeat : 0
    };
  }, [jobs]);

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => {
        const display =
          tile.id === 'avgHeat'
            ? metrics.avgHeat.toFixed(1)
            : String(
                tile.id === 'active'
                  ? metrics.activeCount
                  : tile.id === 'hot'
                    ? metrics.hotCount
                    : metrics.followupsDueToday
              );

        const sublabel =
          tile.id === 'avgHeat'
            ? '0 (cold) → 3 (blazing)'
            : tile.id === 'hot'
              ? 'Heat ≥ 2'
              : tile.id === 'followups'
                ? 'Due before midnight'
                : 'Not rejected/dormant';

        return (
          <article
            key={tile.id}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{tile.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {display}
              </p>
              <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
            </div>
            <span
              aria-hidden="true"
              className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${tile.accent}`}
            >
              {tile.icon}
            </span>
          </article>
        );
      })}
    </section>
  );
};
