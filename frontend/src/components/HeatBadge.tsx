import { useEffect, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { formatDistanceToNow } from 'date-fns';
import { useJobHeatExplainQuery } from '../api/hooks';

const heatVariants: Record<number, { icon: string; label: string; classes: string }> = {
  0: { icon: '🧊', label: 'Cold', classes: 'bg-slate-200 text-slate-700' },
  1: { icon: '🌤', label: 'Warming', classes: 'bg-amber-100 text-amber-700' },
  2: { icon: '🔥', label: 'Hot', classes: 'bg-orange-100 text-orange-700' },
  3: { icon: '🚀', label: 'Blazing', classes: 'bg-rose-100 text-rose-700' }
};

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0
});

const formatSignedValue = (value: number) => {
  if (Number.isNaN(value)) {
    return '0';
  }
  const formatted = numberFormatter.format(value);
  return value > 0 ? `+${formatted}` : formatted;
};

const formatValuePair = (value?: number, max?: number) => {
  if (value === undefined || value === null) {
    return '0';
  }
  const formattedValue = formatSignedValue(value);
  if (max === undefined || max === null) {
    return formattedValue;
  }
  const formattedMax = numberFormatter.format(max);
  return `${formattedValue} / ${formattedMax}`;
};

const contributionTone = (value?: number) => {
  if (value === undefined || value === null) {
    return 'text-slate-500';
  }
  if (value > 0) {
    return 'text-emerald-600';
  }
  if (value < 0) {
    return 'text-rose-600';
  }
  return 'text-slate-500';
};

export const HeatBadge = ({ heat, jobId }: { heat: number; jobId?: string }) => {
  const variant = heatVariants[heat] ?? heatVariants[0];

  if (!jobId) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${variant.classes}`}
      >
        <span>{variant.icon}</span>
        {variant.label}
      </span>
    );
  }

  const [open, setOpen] = useState(false);
  const { data, isFetching, isError, refetch } = useJobHeatExplainQuery(jobId, {
    enabled: false
  });

  useEffect(() => {
    if (open) {
      void refetch();
    }
  }, [open, refetch]);

  const breakdown = useMemo(() => data?.breakdown ?? [], [data]);
  const lastTouchLabel = useMemo(() => {
    if (!data?.lastTouchAt) {
      return null;
    }
    const parsed = new Date(data.lastTouchAt);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return formatDistanceToNow(parsed, { addSuffix: true });
  }, [data?.lastTouchAt]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 ${variant.classes}`}
          aria-label="View heat breakdown"
        >
          <span>{variant.icon}</span>
          {variant.label}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={8}
          className="w-80 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl focus:outline-none"
        >
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Heat score
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {data?.score ?? '—'}
                <span className="text-sm font-normal text-slate-500"> / 100</span>
              </p>
              {lastTouchLabel && (
                <p className="text-xs text-slate-500">Last touch {lastTouchLabel}</p>
              )}
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${variant.classes}`}>
              <span>{variant.icon}</span>
              {variant.label}
            </span>
          </header>

          <div className="mt-4 space-y-3">
            {isFetching && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                Updating breakdown…
              </div>
            )}
            {isError && !isFetching && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">
                Unable to load heat explanation.
              </p>
            )}
            {!isFetching && !isError && breakdown.length === 0 && (
              <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                No detailed breakdown available.
              </p>
            )}
            {!isError &&
              breakdown.map((item, index) => {
                if (item.category === 'decay') {
                  const valueLabel = formatValuePair(item.value, item.maxValue);
                  return (
                    <div
                      key={`${item.category}-${index}`}
                      className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span>Recency decay</span>
                        <span>{valueLabel}</span>
                      </div>
                      {item.note && (
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-600">
                          {item.note}
                        </p>
                      )}
                    </div>
                  );
                }

                const valueLabel = formatValuePair(item.value, item.maxValue);
                const tone = contributionTone(item.value);
                return (
                  <div
                    key={`${item.category}-${index}`}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>{item.label}</span>
                      <span className={tone}>{valueLabel}</span>
                    </div>
                    {item.note && (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                        {item.note}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
          <Popover.Arrow className="fill-white drop-shadow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
