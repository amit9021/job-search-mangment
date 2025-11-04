import { Link } from 'react-router-dom';
import type { WeeklySummaryResponse } from '../../api/useStats';

type HeatData = WeeklySummaryResponse['heat'] | undefined;

type Props = {
  heat?: HeatData;
  loading?: boolean;
  onSelect?: (bucket: 0 | 1 | 2 | 3) => void;
};

const BUCKETS: Array<{ key: keyof NonNullable<HeatData>; label: string; color: string; bucket: 0 | 1 | 2 | 3 }> = [
  { key: 'h0', label: 'H0', color: '#cbd5f5', bucket: 0 },
  { key: 'h1', label: 'H1', color: '#7c9df0', bucket: 1 },
  { key: 'h2', label: 'H2', color: '#2563eb', bucket: 2 },
  { key: 'h3', label: 'H3', color: '#1d4ed8', bucket: 3 }
];

export const HeatCompact = ({ heat, loading, onSelect }: Props) => {
  if (loading) {
    return (
      <div className="flex h-full flex-col justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (!heat) {
    return (
      <div className="flex h-full flex-col justify-between text-xs text-slate-500">
        <p className="font-semibold text-slate-600">Heat buckets</p>
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center">
          Add fresh opportunities to map your pipeline heat.
        </div>
      </div>
    );
  }

  const total = Math.max(BUCKETS.reduce((acc, bucket) => acc + (heat[bucket.key] ?? 0), 0), 1);
  const deltaValues = heat.delta ?? { h0: 0, h1: 0, h2: 0, h3: 0 };

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span>Heat buckets</span>
        <span className="text-slate-300">{total} total</span>
      </div>
      <div className="flex overflow-hidden rounded-md border border-slate-200">
        {BUCKETS.map(({ key, label, color, bucket }) => {
          const count = heat[key] ?? 0;
          const width = Math.max((count / total) * 100, 6);
          const delta = deltaValues[key as 'h0' | 'h1' | 'h2' | 'h3'];
          const formattedDelta =
            delta === 0 ? '–' : delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`;
          const content = (
            <div className="flex h-14 flex-1 flex-col justify-center px-2 text-white" style={{ backgroundColor: color }}>
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-xs font-medium text-white/90">{count}</span>
            </div>
          );
          const body = onSelect ? (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(bucket)}
              className="group relative flex flex-1 flex-col"
              style={{ flexBasis: `${width}%` }}
            >
              {content}
              <span className="absolute inset-x-0 bottom-1 text-[10px] font-semibold text-white/80 opacity-0 transition group-hover:opacity-100">
                {formattedDelta}
              </span>
            </button>
          ) : (
            <Link key={key} to={`/jobs?heat=${bucket}&view=table`} className="group relative flex flex-1 flex-col" style={{ flexBasis: `${width}%` }}>
              {content}
              <span className="absolute inset-x-0 bottom-1 text-[10px] font-semibold text-white/80 opacity-0 transition group-hover:opacity-100">
                {formattedDelta}
              </span>
            </Link>
          );
          return body;
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>▲ higher vs previous range · ▼ lower</span>
      </div>
    </div>
  );
};
