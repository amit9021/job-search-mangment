import type { DashboardSummary } from '../../api/dashboard';

type KpiTilesProps = {
  kpis?: DashboardSummary['kpis'];
  loading?: boolean;
};

type TileDescriptor = {
  key: keyof DashboardSummary['kpis'];
  label: string;
  value: number;
  target?: number;
  helper: string;
  tooltip: string;
  emphasize?: boolean;
};

const SkeletonTile = () => (
  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="h-3 w-16 rounded bg-slate-200" />
    <div className="h-6 w-20 rounded bg-slate-200" />
    <div className="h-3 w-28 rounded bg-slate-200" />
  </div>
);

export const KpiTiles = ({ kpis, loading }: KpiTilesProps) => {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </div>
    );
  }

  const tiles: TileDescriptor[] = kpis
    ? [
        {
          key: 'tailoredCvs',
          label: 'Tailored CVs',
          value: kpis.tailoredCvs.sentToday,
          target: kpis.tailoredCvs.dailyTarget,
          helper: `Target ${kpis.tailoredCvs.dailyTarget} per day`,
          tooltip: 'Count of tailored CVs sent today versus your daily target.'
        },
        {
          key: 'outreach',
          label: 'Warm outreach',
          value: kpis.outreach.warmSentToday,
          target: kpis.outreach.dailyTarget,
          helper: `Target ${kpis.outreach.dailyTarget} warm touches`,
          tooltip: 'Warm outreaches logged today. Aim for at least five genuine conversations each day.'
        },
        {
          key: 'tasks',
          label: 'Follow-ups due',
          value: kpis.followUpsDue,
          helper: 'Includes overdue + due today across jobs and contacts.',
          tooltip: 'Follow-ups that need attention today. Keep this low to maintain momentum.',
          emphasize: kpis.followUpsDue > 0
        },
        {
          key: 'seniorReviewsThisWeek',
          label: 'Senior reviews',
          value: kpis.seniorReviewsThisWeek,
          helper: 'Reviews received this week (code, portfolio, mock interviews).',
          tooltip: 'Senior reviews completed during the current week. Aim for at least one to stay sharp.'
        }
      ]
    : [];

  const zeroState = !loading && (!kpis || tiles.every((tile) => tile.value === 0));

  if (zeroState) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <h3 className="text-base font-semibold text-slate-700">Kickstart your search</h3>
        <p className="mt-2">Log today&apos;s tailored CVs or warm outreaches to light up your momentum tiles.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          title={tile.tooltip}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
            <span>{tile.label}</span>
            {typeof tile.target === 'number' && (
              <span className="font-semibold text-slate-500">
                {tile.value}/{tile.target}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p
              className={`text-3xl font-semibold ${tile.emphasize ? 'text-rose-600' : 'text-slate-900'}`}
            >
              {tile.value}
            </p>
            {typeof tile.target === 'number' && tile.target > 0 && (
              <span className="text-xs font-semibold text-slate-400">
                {Math.min(100, Math.round((tile.value / tile.target) * 100))}%
              </span>
            )}
          </div>
          {typeof tile.target === 'number' && tile.target > 0 && (
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${
                  tile.value >= tile.target ? 'bg-emerald-500' : 'bg-brand'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((tile.value / tile.target) * 100))}%`
                }}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">{tile.helper}</p>
        </div>
      ))}
    </div>
  );
};
