type Props = {
  range: 7 | 14 | 30;
  onChange: (range: 7 | 14 | 30) => void;
  busy?: boolean;
};

const options: Array<{ label: string; value: 7 | 14 | 30 }> = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 }
];

export const TimeRangeSelector = ({ range, onChange, busy }: Props) => (
  <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      <span>Range</span>
      {busy && <span className="animate-pulse text-[10px] text-slate-500">Syncing…</span>}
    </div>
    <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-500">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-full px-2.5 py-1.5 transition ${
            range === option.value ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
