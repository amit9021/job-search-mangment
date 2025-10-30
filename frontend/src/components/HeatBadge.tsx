const heatMap: Record<number, { icon: string; label: string; color: string }> = {
  0: { icon: '❄️', label: 'Cold', color: 'bg-slate-200 text-slate-600' },
  1: { icon: '🔥', label: 'Warm', color: 'bg-orange-100 text-orange-600' },
  2: { icon: '🔥🔥', label: 'Hot', color: 'bg-red-100 text-red-600' },
  3: { icon: '🔥🔥🔥', label: 'Very Hot', color: 'bg-red-200 text-red-700' }
};

export const HeatBadge = ({ heat }: { heat: number }) => {
  const variant = heatMap[heat] ?? heatMap[0];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${variant.color}`}>
      <span>{variant.icon}</span>
      {variant.label}
    </span>
  );
};
