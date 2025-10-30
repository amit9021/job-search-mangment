const strengthStyles: Record<string, string> = {
  WEAK: 'bg-slate-200 text-slate-600',
  MEDIUM: 'bg-amber-100 text-amber-600',
  STRONG: 'bg-emerald-100 text-emerald-600'
};

export const StrengthBadge = ({ strength }: { strength: string }) => {
  const style = strengthStyles[strength] ?? strengthStyles.WEAK;
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${style}`}>
      {strength.toLowerCase()}
    </span>
  );
};
