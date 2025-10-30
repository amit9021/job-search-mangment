import { useMemo } from 'react';
import { useKpiTodayQuery, useKpiWeekQuery, useFollowupsQuery, useNotificationsQuery } from '../api/hooks';
import { KpiCard } from '../components/KpiCard';
import { FollowUpList } from '../components/FollowUpList';

export const DashboardPage = () => {
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
