import { Link } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../api/useDashboard';

type NextBestActionCompactProps = {
  action?: DashboardSummaryResponse['nextBestAction'];
  loading?: boolean;
  degraded?: boolean;
  onExplain?: () => void;
};

const Skeleton = () => (
  <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="space-y-2">
      <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
      <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
    </div>
    <div className="h-9 w-28 animate-pulse rounded-md bg-slate-200" />
  </div>
);

export const NextBestActionCompact = ({ action, loading, degraded, onExplain }: NextBestActionCompactProps) => {
  if (loading) {
    return <Skeleton />;
  }

  if (!action) {
    return (
      <div className="flex h-full flex-col justify-between rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">Nothing queued up</p>
          <p>Log a tailored CV or warm outreach to unlock the next directed step.</p>
        </div>
        <div className="flex gap-2 text-sm font-semibold">
          <Link
            to="/jobs?view=table"
            className="flex-1 rounded-md bg-brand px-3 py-2 text-center text-white transition hover:bg-brand-dark"
          >
            Add job
          </Link>
          <Link
            to="/contacts?strength=STRONG"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-center text-slate-600 transition hover:bg-slate-50"
          >
            Warm outreach
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-brand">
          <span>Next best action</span>
          {degraded && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Partial</span>
          )}
        </div>
        <h2 className="truncate text-lg font-semibold text-slate-900">{action.title}</h2>
        <p className="truncate text-xs text-slate-500">{action.reason}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Link
          to={action.ctaLink}
          className="flex-1 rounded-md bg-brand px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          {renderActionLabel(action.suggestedAction)}
        </Link>
        <button
          type="button"
          onClick={onExplain}
          className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-brand hover:underline"
        >
          Why this?
        </button>
      </div>
    </div>
  );
};

const renderActionLabel = (suggested: DashboardSummaryResponse['nextBestAction']['suggestedAction']) => {
  switch (suggested) {
    case 'follow_up':
      return 'Follow up';
    case 'send_outreach':
      return 'Send outreach';
    case 'apply':
      return 'Send application';
    case 'review':
    default:
      return 'Review pipeline';
  }
};
