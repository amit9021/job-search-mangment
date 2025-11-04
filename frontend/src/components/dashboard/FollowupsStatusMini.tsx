import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';

type Props = {
  totals: { done: number; due: number };
  loading?: boolean;
};

const COLORS = ['#0ea5e9', '#f97316'];

export const FollowupsStatusMini = ({ totals, loading }: Props) => {
  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="h-24 w-24 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-3 h-3 w-20 animate-pulse rounded bg-slate-200" />
        <div className="mt-1 h-3 w-24 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  const data = [
    { name: 'Done', value: totals.done },
    { name: 'Due + overdue', value: totals.due }
  ];

  const total = totals.done + totals.due;
  const completion = total === 0 ? 0 : Math.round((totals.done / total) * 100);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="relative h-28 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={44}
              outerRadius={56}
              strokeWidth={0}
              paddingAngle={data.some((item) => item.value === 0) ? 0 : 4}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-slate-900">{completion}%</span>
        </div>
      </div>
      <div className="mt-2 flex text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Done {totals.done}
        </span>
        <span className="mx-2 text-slate-300">•</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          Due+Over {totals.due}
        </span>
      </div>
    </div>
  );
};
