import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardSummary } from '../../api/dashboard';

type PipelineHeatMapProps = {
  buckets?: DashboardSummary['heat']['buckets'];
  loading?: boolean;
};

const HEAT_DESCRIPTIONS = {
  h0: 'Cold pipeline. Needs fresh momentum.',
  h1: 'Warm leads starting to engage.',
  h2: 'Active conversations in progress.',
  h3: 'Hot opportunities close to a decision.'
};

const HEAT_LABELS = {
  h0: 'Heat 0',
  h1: 'Heat 1',
  h2: 'Heat 2',
  h3: 'Heat 3'
};

const skeletonCard = (key: string) => (
  <div key={key} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
    <div className="mt-6 h-8 w-10 animate-pulse rounded bg-slate-200" />
    <div className="mt-3 h-3 w-24 animate-pulse rounded bg-slate-200" />
  </div>
);

export const PipelineHeatMap = ({ buckets, loading }: PipelineHeatMapProps) => {
  const navigate = useNavigate();

  const entries = useMemo(() => {
    if (!buckets) {
      return [];
    }
    return (Object.keys(buckets) as Array<keyof DashboardSummary['heat']['buckets']>).map((key) => ({
      key,
      label: HEAT_LABELS[key],
      description: HEAT_DESCRIPTIONS[key],
      value: buckets[key]
    }));
  }, [buckets]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {['h0', 'h1', 'h2', 'h3'].map((key) => skeletonCard(key))}
      </div>
    );
  }

  const total = entries.reduce((acc, item) => acc + item.value, 0);

  if (!entries.length || total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <h3 className="text-base font-semibold text-slate-700">No jobs tracked yet</h3>
        <p className="mt-2">
          Add your active applications and referrals to start seeing heat scores and opportunity insights.
        </p>
        <button
          type="button"
          className="mt-4 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          onClick={() => navigate('/jobs?modal=new')}
        >
          Add a job
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {entries.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => navigate(`/jobs?heat=${item.key.slice(-1)}`)}
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
          title={`${item.label}: ${item.description}`}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
            <span>{item.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 group-hover:bg-brand-muted group-hover:text-brand">
              View jobs
            </span>
          </div>
          <p className="mt-6 text-3xl font-semibold text-slate-900 group-hover:text-brand">{item.value}</p>
          <p className="mt-3 text-xs text-slate-500">{item.description}</p>
        </button>
      ))}
    </div>
  );
};
