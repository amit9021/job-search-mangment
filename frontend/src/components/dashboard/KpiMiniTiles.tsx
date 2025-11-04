import { Link } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { DashboardSummaryResponse } from '../../api/useDashboard';

type Props = {
  kpis?: DashboardSummaryResponse['kpis'];
  loading?: boolean;
};

const SkeletonTile = () => (
  <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="space-y-2">
      <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
      <div className="h-6 w-14 animate-pulse rounded bg-slate-200" />
    </div>
    <div className="h-6 w-full animate-pulse rounded bg-slate-200" />
  </div>
);

export const KpiMiniTiles = ({ kpis, loading }: Props) => {
  if (loading) {
    return (
      <div className="grid h-full grid-cols-2 gap-2">
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-slate-200 bg-white p-3 text-center text-xs text-slate-500">
        Log tailored CVs, warm outreaches, and follow-ups to unlock targets and trends.
      </div>
    );
  }

  const tiles: Array<{
    key: string;
    label: string;
    value: number;
    target?: number;
    spark?: number[];
    link: string;
  }> = [
    {
      key: 'cvs',
      label: 'Tailored CVs',
      value: kpis.tailoredCvs.sentToday,
      target: kpis.tailoredCvs.targetDaily,
      spark: kpis.tailoredCvs.spark,
      link: '/jobs?view=table'
    },
    {
      key: 'outreach',
      label: 'Warm outreach',
      value: kpis.outreach.sentToday,
      target: kpis.outreach.targetDaily,
      spark: kpis.outreach.spark,
      link: '/contacts?strength=STRONG'
    },
    {
      key: 'followups',
      label: 'Follow-ups due',
      value: kpis.followUpsDue,
      link: '/jobs?view=table&followups=today'
    },
    {
      key: 'reviews',
      label: 'Senior reviews',
      value: kpis.seniorReviewsThisWeek,
      link: '/growth'
    }
  ];

  return (
    <div className="grid h-full grid-cols-2 gap-2">
      {tiles.map((tile) => {
        const hitTarget = tile.target !== undefined && tile.target > 0 && tile.value >= tile.target;
        const completion =
          tile.target && tile.target > 0 ? Math.min(100, Math.round((tile.value / tile.target) * 100)) : undefined;

        return (
          <Link
            key={tile.key}
            to={tile.link}
            className={`flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg ${
              hitTarget ? 'ring-1 ring-emerald-200' : ''
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>{tile.label}</span>
                {tile.target !== undefined && (
                  <span className="text-slate-500">
                    {tile.value}/{tile.target}
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-slate-900">{tile.value}</span>
                {completion !== undefined && (
                  <span className={`text-[11px] font-semibold ${hitTarget ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {completion}% target
                  </span>
                )}
              </div>
            </div>
            {tile.spark && tile.spark.length > 0 ? (
              <div className="h-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tile.spark.map((value, index) => ({ index, value }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-6 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                No history
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
};
