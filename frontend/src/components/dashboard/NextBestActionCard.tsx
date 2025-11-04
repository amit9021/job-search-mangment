import { Link } from 'react-router-dom';
import type { DashboardSummary } from '../../api/dashboard';

const friendlyActionLabels: Record<DashboardSummary['nextBestAction']['suggestedAction'], string> = {
  follow_up: 'Follow up',
  send_outreach: 'Send outreach',
  apply: 'Submit application',
  review: 'Review pipeline'
};

type NextBestActionCardProps = {
  action?: DashboardSummary['nextBestAction'];
  loading?: boolean;
  degraded?: boolean;
};

const Skeleton = () => (
  <div className="h-full animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="h-4 w-24 rounded bg-slate-200" />
    <div className="mt-4 h-6 w-64 rounded bg-slate-200" />
    <div className="mt-3 h-4 w-48 rounded bg-slate-200" />
    <div className="mt-6 h-10 w-36 rounded-md bg-slate-300" />
  </div>
);

export const NextBestActionCard = ({ action, loading, degraded }: NextBestActionCardProps) => {
  if (loading) {
    return <Skeleton />;
  }

  if (!action) {
    return (
      <div className="h-full rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
        <h2 className="text-base font-semibold text-slate-700">Ready when you are</h2>
        <p className="mt-2 text-sm">Add a job or log a warm outreach to get tailored guidance.</p>
        <div className="mt-4 flex gap-3">
          <Link
            to="/jobs?modal=new"
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Add a job
          </Link>
          <Link
            to="/contacts?strength=STRONG"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Warm outreach
          </Link>
        </div>
      </div>
    );
  }

  const actionLabel = friendlyActionLabels[action.suggestedAction];

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            Next best action
            {degraded && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-600">
                Partial data
              </span>
            )}
          </span>
          <h2 className="text-2xl font-semibold text-slate-900">{action.title}</h2>
        </div>
        {action.job && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-sm font-semibold text-slate-700">{action.job.company}</p>
            <p className="text-xs text-slate-500">{action.job.role}</p>
            <p className="mt-1 text-xs text-slate-400">Heat {action.job.heat}</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-600" title={action.reason}>
        {action.reason}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          to={action.ctaLink}
          className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          {actionLabel}
        </Link>
        <span className="text-xs uppercase tracking-wide text-slate-400">Shortcut: Enter</span>
      </div>
    </div>
  );
};
