import { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
  target?: number;
  helper?: ReactNode;
}

export const KpiCard = ({ label, value, target, helper }: KpiCardProps) => {
  const progress = target ? Math.min(100, Math.round((Number(value) / target) * 100)) : null;
  const hitsTarget = target ? Number(value) >= target : false;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {target ? (
          <span className={`text-xs font-semibold ${hitsTarget ? 'text-emerald-600' : 'text-slate-400'}`}>
            {value}/{target}
          </span>
        ) : (
          <span className="text-sm font-semibold text-slate-500">{value}</span>
        )}
      </div>
      {target && (
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div
            className={`h-2 rounded-full ${hitsTarget ? 'bg-emerald-500' : 'bg-brand'}`}
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      )}
      {helper && <div className="mt-3 text-xs text-slate-500">{helper}</div>}
    </div>
  );
};
