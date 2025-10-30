interface ScoreDialProps {
  score: number;
  label: string;
}

export const ScoreDial = ({ score, label }: ScoreDialProps) => {
  const normalized = Math.min(100, Math.max(0, score));
  const strokeDasharray = `${normalized}, 100`;

  return (
    <div className="flex flex-col items-center">
      <svg className="h-20 w-20" viewBox="0 0 36 36">
        <path
          className="fill-none stroke-slate-200"
          strokeWidth="3"
          d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="fill-none stroke-brand"
          strokeLinecap="round"
          strokeWidth="3"
          strokeDasharray={strokeDasharray}
          d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <text x="18" y="20.35" className="fill-slate-900 text-base font-semibold" textAnchor="middle">
          {normalized}
        </text>
      </svg>
      <span className="mt-2 text-xs uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
};
