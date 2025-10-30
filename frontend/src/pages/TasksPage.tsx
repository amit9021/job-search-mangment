import { useState } from 'react';
import { useFollowupsQuery, useMarkFollowupMutation, useNotificationsQuery } from '../api/hooks';
import { FollowUpList } from '../components/FollowUpList';

const followupFilters: Array<{ label: string; value: 'today' | 'upcoming' | 'overdue' }> = [
  { label: 'Today', value: 'today' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Overdue', value: 'overdue' }
];

export const TasksPage = () => {
  const [scope, setScope] = useState<'today' | 'upcoming' | 'overdue'>('today');
  const { data: followups } = useFollowupsQuery(scope);
  const { data: notifications } = useNotificationsQuery(scope);
  const markFollowup = useMarkFollowupMutation();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Daily cadence</h2>
        <div className="flex gap-2">
          {followupFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setScope(filter.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                scope === filter.value ? 'bg-brand text-white' : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">Follow-ups</h3>
        <div className="mt-4">
          <FollowUpList items={followups ?? []} onComplete={(id) => markFollowup.mutate({ id })} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">Notifications</h3>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {(notifications ?? []).map((notification) => (
            <li key={notification.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              {notification.message}
            </li>
          ))}
          {(notifications ?? []).length === 0 && <li className="text-xs text-slate-400">Clear runway. Keep going!</li>}
        </ul>
      </section>
    </div>
  );
};
