import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardSummary } from '../../api/dashboard';
import {
  useMarkFollowupMutation,
  useTaskSnoozeMutation,
  useTaskUpdateMutation
} from '../../api/hooks';

type TodayQueueProps = {
  items?: DashboardSummary['todayQueue'];
  loading?: boolean;
  onRefresh?: () => void;
};

const SkeletonRow = () => (
  <li className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
    <div className="flex flex-col gap-2">
      <div className="h-4 w-60 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
    </div>
    <div className="flex gap-2">
      <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
      <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
    </div>
  </li>
);

const formatDue = (iso: string | null): string => {
  if (!iso) {
    return 'Anytime';
  }
  const dueDate = new Date(iso);
  if (Number.isNaN(dueDate.getTime())) {
    return 'Anytime';
  }

  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}d overdue`;
  }
  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Tomorrow';
  }
  return `In ${diffDays}d`;
};

const getTypeBadge = (type: DashboardSummary['todayQueue'][number]['type']) => {
  switch (type) {
    case 'follow_up':
      return 'Follow-up';
    case 'task':
      return 'Task';
    case 'stale_outreach':
      return 'Stale outreach';
    default:
      return 'Action';
  }
};

export const TodayQueue = ({ items, loading, onRefresh }: TodayQueueProps) => {
  const navigate = useNavigate();
  const { mutateAsync: markFollowup, isPending: isMarkingFollowup } = useMarkFollowupMutation();
  const { mutateAsync: markTaskDone, isPending: isMarkingTask } = useTaskUpdateMutation();
  const { mutateAsync: snoozeTask, isPending: isSnoozingTask } = useTaskSnoozeMutation();

  const firstItem = items?.[0];

  const keyboardEnabled = useMemo(() => Boolean(items && items.length > 0), [items]);

  useEffect(() => {
    if (!keyboardEnabled) {
      return undefined;
    }

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (!firstItem) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        navigate(firstItem.ctaLink);
      }

      if (event.key === ' ' && (firstItem.type === 'task' || firstItem.type === 'follow_up')) {
        event.preventDefault();
        void handlePrimaryAction(firstItem);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [firstItem, keyboardEnabled, navigate]);

  const refreshing = isMarkingFollowup || isMarkingTask || isSnoozingTask;

  const handlePrimaryAction = async (item: DashboardSummary['todayQueue'][number]) => {
    const context = item.context ?? {};
    if (item.type === 'follow_up' && context.followupId) {
      await markFollowup({
        id: context.followupId,
        jobId: context.jobId,
        contactId: context.contactId,
        note: undefined
      });
      await onRefresh?.();
      return;
    }

    if (item.type === 'task' && context.taskId) {
      await markTaskDone({
        id: context.taskId,
        updates: { status: 'Done' }
      });
      await onRefresh?.();
    }
  };

  const handleSnooze = async (item: DashboardSummary['todayQueue'][number]) => {
    const context = item.context ?? {};
    if (item.type === 'task' && context.taskId) {
      await snoozeTask({ id: context.taskId, preset: 'tomorrow' });
      await onRefresh?.();
    }
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Today&apos;s queue</h3>
            <p className="text-xs text-slate-500">Enter opens the first item • Space completes it</p>
          </div>
        </header>
        <ul>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ul>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <h3 className="text-base font-semibold text-slate-700">Nothing queued yet</h3>
        <p className="mt-2">Log follow-ups or tasks to populate your action queue. We&apos;ll keep it prioritized for you.</p>
        <button
          type="button"
          className="mt-4 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          onClick={() => navigate('/tasks?view=today')}
        >
          Review tasks
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Today&apos;s queue</h3>
          <p className="text-xs text-slate-500">Enter opens the first item • Space marks it complete</p>
        </div>
        {refreshing && <span className="text-xs font-semibold uppercase text-slate-400">Updating…</span>}
      </header>
      <ul>
        {items.map((item) => {
          const context = item.context ?? ({} as NonNullable<typeof item.context>);
          const itemKey =
            context.taskId ||
            context.followupId ||
            context.outreachId ||
            `${item.type}-${item.ctaLink}`;
          return (
            <li key={itemKey} className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {getTypeBadge(item.type)}
                  </span>
                  <span className="text-xs font-medium text-slate-400">{formatDue(item.dueAt)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-800">{item.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  onClick={() => navigate(item.ctaLink)}
                >
                  Open
                </button>
                {(item.type === 'follow_up' && context.followupId) || (item.type === 'task' && context.taskId) ? (
                  <button
                    type="button"
                    className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handlePrimaryAction(item)}
                    disabled={refreshing}
                  >
                    Mark done
                  </button>
                ) : null}
                {item.type === 'task' && context.taskId ? (
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handleSnooze(item)}
                    disabled={refreshing}
                  >
                    Snooze
                  </button>
                ) : null}
              </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
