import { Link } from 'react-router-dom';
import type { WeeklySummaryResponse } from '../../api/useStats';

type Props = {
  heat?: WeeklySummaryResponse['heat'];
  loading?: boolean;
};

const bucketsMeta = [
  { key: 'h0', label: 'Heat 0', tone: 'text-slate-600', border: 'border-slate-200' },
  { key: 'h1', label: 'Heat 1', tone: 'text-amber-600', border: 'border-amber-200' },
  { key: 'h2', label: 'Heat 2', tone: 'text-orange-600', border: 'border-orange-200' },
  { key: 'h3', label: 'Heat 3', tone: 'text-rose-600', border: 'border-rose-200' }
] as const;

const Skeleton = () => (
  <div className="grid h-full grid-cols-2 gap-3">
    {[0, 1, 2, 3].map((key) => (
      <div key={key} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-8 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

export const HeatBuckets = ({ heat, loading }: Props) => {
  if (loading) {
    return <Skeleton />;
  }

  return (
    <div className="grid h-full grid-cols-2 gap-3">
      {bucketsMeta.map((bucket) => {
        const value = heat ? heat[bucket.key] : 0;
        const delta = heat ? heat.delta[bucket.key] : 0;
        return (
          <Link
            key={bucket.key}
            to={`/jobs?view=table&heat=${bucket.key.slice(-1)}`}
            className={`flex h-full flex-col justify-between rounded-2xl border ${bucket.border} bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg`}
          >
            <div className="text-xs font-semibold text-slate-400">{bucket.label}</div>
            <div className={`text-2xl font-semibold ${bucket.tone}`}>{value}</div>
            <div className="text-[11px] font-medium text-slate-400">
              {renderDelta(delta)} vs previous range
            </div>
          </Link>
        );
      })}
    </div>
  );
};

const renderDelta = (delta: number) => {
  if (delta === 0) {
    return 'No change';
  }
  const symbol = delta > 0 ? '▲' : '▼';
  const tone = delta > 0 ? 'text-emerald-600' : 'text-rose-600';
  return <span className={tone}>{`${symbol} ${Math.abs(delta)}`}</span>;
};
