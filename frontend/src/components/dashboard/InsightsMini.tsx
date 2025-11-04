import type { WeeklySummaryResponse } from '../../api/useStats';
import { FollowupsStatusMini } from './FollowupsStatusMini';
import { HeatCompact } from './HeatCompact';

type Props = {
  loading?: boolean;
  totals: { done: number; due: number };
  heat?: WeeklySummaryResponse['heat'];
  onHeatSelect?: (bucket: 0 | 1 | 2 | 3) => void;
};

export const InsightsMini = ({ loading, totals, heat, onHeatSelect }: Props) => {
  const followupTotal = totals.done + totals.due;
  const heatTotal =
    (heat?.h0 ?? 0) + (heat?.h1 ?? 0) + (heat?.h2 ?? 0) + (heat?.h3 ?? 0);
  const showZeroState = !loading && followupTotal === 0 && heatTotal === 0;

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span>Follow-ups &amp; heat</span>
      </div>
      {showZeroState ? (
        <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 text-center text-xs text-slate-500">
          Log follow-ups and tag job heat to monitor daily momentum.
        </div>
      ) : (
        <div className="flex flex-1 gap-3">
          <div className="flex w-1/2 items-center justify-center">
            <FollowupsStatusMini totals={totals} loading={loading} />
          </div>
          <div className="flex w-1/2 flex-col justify-center">
            <HeatCompact heat={heat} loading={loading} onSelect={onHeatSelect} />
          </div>
        </div>
      )}
    </div>
  );
};
