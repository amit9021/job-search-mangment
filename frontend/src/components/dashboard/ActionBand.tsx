import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DashboardSummaryResponse, DashboardQueueItemType } from '../../api/useDashboard';
import {
  useMarkFollowupMutation,
  useTaskUpdateMutation,
  useTaskSnoozeMutation
} from '../../api/hooks';

type Props = {
  queue?: DashboardSummaryResponse['todayQueue'];
  notifications?: DashboardSummaryResponse['notifications'];
  loading?: boolean;
};

export const ActionBand = ({ queue, notifications, loading }: Props) => (
  <div className="flex h-full gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <TodayQueuePanel items={queue} loading={loading} />
    <NotificationsPanel notifications={notifications} loading={loading} />
  </div>
);

const TodayQueuePanel = ({
  items,
  loading
}: {
  items?: DashboardSummaryResponse['todayQueue'];
  loading?: boolean;
}) => {
  const navigate = useNavigate();
  const markFollowup = useMarkFollowupMutation();
  const updateTask = useTaskUpdateMutation();
  const snoozeTask = useTaskSnoozeMutation();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const firstItem = items?.[0];

  const keyboardEnabled = useMemo(() => Boolean(items && items.length > 0), [items]);

  useKeyCommands(firstItem, keyboardEnabled, (item) => navigate(item.ctaLink), async (item) => {
    setProcessingId(item.ctaLink);
    try {
      await handleComplete(item, markFollowup.mutateAsync, updateTask.mutateAsync);
    } finally {
      setProcessingId(null);
    }
  });

  const handleSnooze = useCallback(
    async (item: DashboardSummaryResponse['todayQueue'][number]) => {
      const taskId = extractQueryValue(item.ctaLink, 'highlight');
      if (taskId) {
        await snoozeTask.mutateAsync({ id: taskId, preset: 'tomorrow' });
      }
    },
    [snoozeTask]
  );

  return (
    <div className="flex w-1/2 flex-col">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Today&apos;s queue</p>
          <p className="text-xs text-slate-400">Enter opens first item • Space completes</p>
        </div>
      </header>
      <div className="mt-2 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
        {loading ? (
          <QueueSkeleton />
        ) : items && items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.ctaLink} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {renderBadge(item.type)}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-400">{formatDue(item.dueAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-xs font-semibold text-slate-500">
                    <button
                      type="button"
                      onClick={() => navigate(item.ctaLink)}
                      className="rounded-md border border-slate-200 px-2 py-1 transition hover:bg-white"
                    >
                      Open
                    </button>
                    {isCompletable(item.type) && (
                      <button
                        type="button"
                        disabled={processingId === item.ctaLink}
                        onClick={async () => {
                          setProcessingId(item.ctaLink);
                          try {
                            await handleComplete(item, markFollowup.mutateAsync, updateTask.mutateAsync);
                          } finally {
                            setProcessingId(null);
                          }
                        }}
                        className="rounded-md bg-emerald-500 px-2 py-1 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark done
                      </button>
                    )}
                    {item.type === 'task' && (
                      <button
                        type="button"
                        onClick={() => handleSnooze(item)}
                        className="rounded-md border border-slate-200 px-2 py-1 transition hover:bg-white"
                      >
                        Snooze
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No actionable items. Stay sharp!</p>
        )}
      </div>
    </div>
  );
};

const NotificationsPanel = ({
  notifications,
  loading
}: {
  notifications?: DashboardSummaryResponse['notifications'];
  loading?: boolean;
}) => (
  <div className="flex w-1/2 flex-col">
    <header className="flex items-center justify-between">
      <p className="text-sm font-semibold text-slate-700">Notifications</p>
    </header>
    <div className="mt-2 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
      {loading ? (
        <NotificationsSkeleton />
      ) : notifications && notifications.length > 0 ? (
        <ul className="space-y-2">
          {notifications.map((notification, index) => (
            <li key={`${notification.text}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityTone(notification.severity)}`}>
                    {notification.severity}
                  </span>
                  <p className="mt-2 text-sm text-slate-700">{notification.text}</p>
                </div>
                {notification.ctaLink && (
                  <Link
                    to={notification.ctaLink}
                    className="text-xs font-semibold text-brand underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">No nudges. Keep the streak going!</p>
      )}
    </div>
  </div>
);

const severityTone = (severity: DashboardSummaryResponse['notifications'][number]['severity']) => {
  switch (severity) {
    case 'high':
      return 'bg-rose-100 text-rose-600';
    case 'med':
      return 'bg-amber-100 text-amber-600';
    case 'low':
    default:
      return 'bg-slate-100 text-slate-500';
  }
};

const renderBadge = (type: DashboardQueueItemType) => {
  switch (type) {
    case 'follow_up':
      return 'Follow-up';
    case 'task':
      return 'Task';
    case 'stale_outreach':
    default:
      return 'Stale outreach';
  }
};

const formatDue = (iso: string | null) => {
  if (!iso) return 'Anytime';
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return 'Anytime';
  return `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const handleComplete = async (
  item: DashboardSummaryResponse['todayQueue'][number],
  completeFollowup: (params: { id: string; note?: string }) => Promise<unknown>,
  completeTask: (params: { id: string; updates: Record<string, unknown> }) => Promise<unknown>
) => {
  if (item.type === 'follow_up') {
    const followupId = extractQueryValue(item.ctaLink, 'followupId');
    if (followupId) {
      await completeFollowup({ id: followupId });
    }
    return;
  }

  if (item.type === 'task') {
    const taskId = extractQueryValue(item.ctaLink, 'highlight');
    if (taskId) {
      await completeTask({ id: taskId, updates: { status: 'Done' } });
    }
  }
};

const isCompletable = (type: DashboardQueueItemType) => type === 'follow_up' || type === 'task';

const extractQueryValue = (href: string, key: string) => {
  try {
    const url = new URL(href, window.location.origin);
    return url.searchParams.get(key) ?? undefined;
  } catch {
    return undefined;
  }
};

const useKeyCommands = (
  firstItem: DashboardSummaryResponse['todayQueue'][number] | undefined,
  enabled: boolean,
  onOpen: (item: DashboardSummaryResponse['todayQueue'][number]) => void,
  onComplete: (item: DashboardSummaryResponse['todayQueue'][number]) => Promise<void>
) => {
  useEffect(() => {
    if (!enabled || !firstItem) {
      return undefined;
    }

    const handler = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        onOpen(firstItem);
      }

      if (event.key === ' ' && isCompletable(firstItem.type)) {
        event.preventDefault();
        await onComplete(firstItem);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, firstItem, onOpen, onComplete]);
};

const QueueSkeleton = () => (
  <ul className="space-y-2">
    {[0, 1, 2].map((index) => (
      <li key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 flex gap-2">
          <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
        </div>
      </li>
    ))}
  </ul>
);

const NotificationsSkeleton = () => (
  <ul className="space-y-2">
    {[0, 1, 2].map((index) => (
      <li key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-200" />
      </li>
    ))}
  </ul>
);
