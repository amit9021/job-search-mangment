import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../api/useDashboard';

type QueueItem = DashboardSummaryResponse['todayQueue'][number];
type NotificationItem = DashboardSummaryResponse['notifications'][number];

type Props = {
  queue: QueueItem[];
  notifications: NotificationItem[];
  loading?: boolean;
  degraded?: boolean;
};

type TabKey = 'queue' | 'notifications';

const MAX_ITEMS = 6;

export const ActionCenterTabs = ({ queue, notifications, loading, degraded }: Props) => {
  const [activeTab, setActiveTab] = useState<TabKey>('queue');
  const queueItems = useMemo(() => queue.slice(0, MAX_ITEMS), [queue]);
  const notificationItems = useMemo(() => notifications.slice(0, MAX_ITEMS), [notifications]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (activeTab !== 'queue' || queueItems.length === 0) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && ['input', 'textarea'].includes(target.tagName.toLowerCase())) {
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        window.open(queueItems[0].ctaLink, '_blank');
      } else if (event.key === ' ') {
        event.preventDefault();
        window.open(appendParam(queueItems[0].ctaLink, 'complete', '1'), '_blank');
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [activeTab, queueItems]);

  const renderList = () => {
    if (loading) {
      return <SkeletonList />;
    }

    if (activeTab === 'queue') {
      if (queueItems.length === 0) {
        return <EmptyState message="Nothing queued — you’re all caught up!" />;
      }
      return (
        <ul className="space-y-2">
          {queueItems.map((item, index) => (
            <li key={`${item.type}-${item.ctaLink}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="truncate text-[11px] text-slate-500">{formatDue(item.dueAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <ActionButton label="Open" href={item.ctaLink} />
                <ActionButton label="Mark done" href={appendParam(item.ctaLink, 'complete', '1')} variant="ghost" />
              </div>
            </li>
          ))}
        </ul>
      );
    }

    if (notificationItems.length === 0) {
      return <EmptyState message="No nudges right now. Keep the streak alive!" />;
    }

    return (
      <ul className="space-y-2">
        {notificationItems.map((item, index) => (
          <li key={`${item.text}-${item.ctaLink ?? 'noop'}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{item.text}</p>
              <p className={`text-[11px] font-semibold ${notificationTone(item.severity)}`}>{item.severity.toUpperCase()}</p>
            </div>
            {item.ctaLink && <ActionButton label="Open" href={item.ctaLink} />}
          </li>
        ))}
      </ul>
    );
  };

  const viewAllLink = activeTab === 'queue' ? '/tasks?view=today' : '/notifications';

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
          <TabButton active={activeTab === 'queue'} label={`Queue (${queue.length})`} onClick={() => setActiveTab('queue')} />
          <TabButton active={activeTab === 'notifications'} label={`Notifications (${notifications.length})`} onClick={() => setActiveTab('notifications')} />
        </div>
        {degraded && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Partial</span>}
      </div>
      <div className="mt-2 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pr-1">{renderList()}</div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>Enter → open · Space → mark done</span>
        <Link to={viewAllLink} className="font-semibold text-brand hover:underline">
          View all
        </Link>
      </div>
    </div>
  );
};

const TabButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
      active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-white'
    }`}
  >
    {label}
  </button>
);

const ActionButton = ({ label, href, variant }: { label: string; href: string; variant?: 'ghost' }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
      variant === 'ghost'
        ? 'border border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-white'
        : 'bg-brand text-white hover:bg-brand-dark'
    }`}
  >
    {label}
  </a>
);

const SkeletonList = () => (
  <ul className="space-y-2">
    {[1, 2, 3, 4].map((item) => (
      <li key={item} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
        <div className="min-w-0">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-1 h-3 w-20 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-7 w-12 animate-pulse rounded bg-slate-200" />
          <div className="h-7 w-16 animate-pulse rounded bg-slate-200" />
        </div>
      </li>
    ))}
  </ul>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
    {message}
  </div>
);

const formatDue = (dueAt: string | null) => {
  if (!dueAt) {
    return 'No due date';
  }
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return 'Due –';
  }
  const now = Date.now();
  const diffDays = Math.round((due.getTime() - now) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return 'Due today';
  }
  if (diffDays > 0) {
    return `Due in ${diffDays}d`;
  }
  return `Overdue by ${Math.abs(diffDays)}d`;
};

const notificationTone = (severity: NotificationItem['severity']) => {
  switch (severity) {
    case 'high':
      return 'text-rose-500';
    case 'med':
      return 'text-amber-500';
    default:
      return 'text-slate-500';
  }
};

const appendParam = (href: string, key: string, value: string) => {
  try {
    const url = new URL(href, window.location.origin);
    url.searchParams.set(key, value);
    return url.pathname + url.search + url.hash;
  } catch (error) {
    const separator = href.includes('?') ? '&' : '?';
    return `${href}${separator}${key}=${value}`;
  }
};
