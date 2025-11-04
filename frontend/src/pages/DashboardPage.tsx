import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardSummary } from '../api/useDashboard';
import { useWeeklySummary } from '../api/useStats';
import { NextBestActionCompact } from '../components/dashboard/NextBestActionCompact';
import { KpiMiniTiles } from '../components/dashboard/KpiMiniTiles';
import { TimeRangeSelector } from '../components/dashboard/TimeRangeSelector';
import { ChartCvsSent } from '../components/dashboard/ChartCvsSent';
import { ChartWarmOutreach } from '../components/dashboard/ChartWarmOutreach';
import { InsightsMini } from '../components/dashboard/InsightsMini';
import { ActionCenterTabs } from '../components/dashboard/ActionCenterTabs';
import {
  useFollowupsQuery,
  useKpiTodayQuery,
  useKpiWeekQuery,
  useNotificationsQuery
} from '../api/hooks';
import { KpiCard } from '../components/KpiCard';
import { FollowUpList } from '../components/FollowUpList';

const DASHBOARD_V1 = (import.meta.env.VITE_DASHBOARD_V1 ?? 'true') !== 'false';

export const DashboardPage = () => {
  if (!DASHBOARD_V1) {
    return <LegacyDashboard />;
  }

  const [range, setRange] = useState<7 | 14 | 30>(7);
  const navigate = useNavigate();
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError,
    isFetching: summaryFetching,
    refetch: refetchSummary
  } = useDashboardSummary(range);
  const {
    data: statsData,
    isLoading: statsLoading,
    isFetching: statsFetching
  } = useWeeklySummary(range);

  const summary = summaryData?.summary;
  const meta = summaryData?.meta;
  const stats = statsData;

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-rose-600">Dashboard unavailable</h2>
        <p className="mt-2 text-sm text-slate-600">We couldn&apos;t load your dashboard right now. Please try again in a moment.</p>
        <button
          type="button"
          className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
          onClick={() => refetchSummary()}
        >
          Retry
        </button>
      </div>
    );
  }

  const loadingSummary = summaryLoading && !summary;
  const loadingStats = statsLoading && !stats;
  const degraded = Boolean(meta?.degraded) || Boolean(stats?.degraded);

  const handleExplain = () => {
    if (summary?.nextBestAction?.job) {
      window.open(`/jobs?focus=${summary.nextBestAction.job.id}&view=table`, '_blank');
    } else {
      window.open('/jobs?view=table', '_blank');
    }
  };

  const followupTotals = useMemo(() => {
    const done = stats?.series.followupsDone?.reduce((acc, point) => acc + point.v, 0) ?? 0;
    const due = stats?.series.followupsDue?.reduce((acc, point) => acc + point.v, 0) ?? 0;
    return { done, due };
  }, [stats]);

  return (
    <div className="mx-auto max-w-screen-xl overflow-hidden px-4 pb-6 pt-4">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
        <span>Mission control · auto refresh every 60s</span>
        {(summaryFetching || statsFetching) && <span>Refreshing…</span>}
      </div>

      {degraded && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          Partial data — we&apos;ll fill the gaps as supporting services catch up.
        </div>
      )}

      <div className="grid h-[calc(100vh-240px)] grid-cols-12 grid-rows-[minmax(0,1.05fr)_minmax(0,1.15fr)_minmax(0,1.4fr)] gap-3">
        <div className="col-span-4 h-full min-h-0">
          <NextBestActionCompact
            action={summary?.nextBestAction}
            loading={loadingSummary}
            degraded={degraded}
            onExplain={handleExplain}
          />
        </div>
        <div className="col-span-6 h-full min-h-0">
          <KpiMiniTiles kpis={summary?.kpis} loading={loadingSummary} />
        </div>
        <div className="col-span-2 h-full min-h-0">
          <TimeRangeSelector range={range} onChange={setRange} busy={summaryFetching || statsFetching} />
        </div>

        <div className="col-span-6 h-full min-h-0">
          <ChartCvsSent data={stats?.series.cvsSent} loading={loadingStats} />
        </div>
        <div className="col-span-6 h-full min-h-0">
          <ChartWarmOutreach data={stats?.series.warmOutreach} loading={loadingStats} />
        </div>

        <div className="col-span-4 h-full min-h-0">
          <InsightsMini
            loading={loadingStats}
            totals={followupTotals}
            heat={stats?.heat}
            onHeatSelect={(bucket) => navigate(`/jobs?heat=${bucket}&view=table`)}
          />
        </div>
        <div className="col-span-8 h-full min-h-0">
          <ActionCenterTabs
            loading={loadingSummary}
            degraded={degraded}
            queue={summary?.todayQueue ?? []}
            notifications={summary?.notifications ?? []}
          />
        </div>
      </div>
    </div>
  );
};

const LegacyDashboard = () => {
  const { data: todayKpis } = useKpiTodayQuery();
  const { data: weekKpis } = useKpiWeekQuery();
  const { data: followups } = useFollowupsQuery('today');
  const { data: notifications } = useNotificationsQuery('today');

  const heatStats = useMemo(() => todayKpis?.heatBreakdown ?? [], [todayKpis]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tailored CVs"
          value={todayKpis?.cvSentToday ?? 0}
          target={todayKpis?.cvTarget ?? 5}
          helper="Target: 5 per day"
        />
        <KpiCard
          label="Outreach"
          value={todayKpis?.outreachToday ?? 0}
          target={todayKpis?.outreachTarget ?? 5}
          helper="Target: 5 warm touches"
        />
        <KpiCard
          label="Follow-ups due"
          value={todayKpis?.followupsDue ?? 0}
          helper="3-day rule across attempts"
        />
        <KpiCard
          label="Senior reviews this week"
          value={todayKpis?.seniorReviewsThisWeek ?? 0}
          helper="Keep momentum on feedback loops"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Pipeline heat map</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {heatStats.map((item) => (
              <div key={item.heat} className="rounded-lg bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{item.count}</p>
                <p className="text-xs text-slate-500">Heat {item.heat}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-600">Weekly snapshot</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>CVs sent: {weekKpis?.cvSent ?? 0}</li>
              <li>Outreach: {weekKpis?.outreach ?? 0}</li>
              <li>Follow-ups completed: {weekKpis?.followupsSent ?? 0}</li>
              <li>Events attended: {weekKpis?.eventsAttended ?? 0}</li>
              <li>Boost tasks done: {weekKpis?.boostTasksDone ?? 0}</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-600">Notifications today</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {(notifications ?? []).map((notification) => (
                <li key={notification.id} className="rounded-md bg-slate-50 px-3 py-2">
                  {notification.message}
                </li>
              ))}
              {(notifications ?? []).length === 0 && <li className="text-xs text-slate-400">No nudges yet.</li>}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Follow-ups today</h2>
          <span className="text-xs text-slate-500">3-day cadence, max 2 attempts</span>
        </div>
        <div className="mt-4">
          <FollowUpList items={followups ?? []} />
        </div>
      </section>
    </div>
  );
};
