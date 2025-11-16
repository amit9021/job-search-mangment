import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DashboardSummaryResponse } from '../../api/useDashboard';
import { useMarkFollowupMutation, useTaskUpdateMutation } from '../../api/hooks';

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
  const markFollowup = useMarkFollowupMutation();
  const updateTask = useTaskUpdateMutation();
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [noteDialog, setNoteDialog] = useState<{
    id: string;
    title: string;
    appointmentMode?: string | null;
  } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const completeFollowup = useCallback(
    async ({
      id,
      jobId,
      contactId,
      note
    }: {
      id: string;
      jobId?: string;
      contactId?: string;
      note?: string;
    }) => {
      setProcessingKey(id);
      try {
        await markFollowup.mutateAsync({ id, jobId, contactId, note });
      } finally {
        setProcessingKey((current) => (current === id ? null : current));
      }
    },
    [markFollowup]
  );

  const completeTask = useCallback(
    async (id: string) => {
      setProcessingKey(id);
      try {
        await updateTask.mutateAsync({ id, updates: { status: 'Done' } });
      } finally {
        setProcessingKey((current) => (current === id ? null : current));
      }
    },
    [updateTask]
  );

  const handleMarkDone = useCallback(
    async (item: QueueItem) => {
      if (item.type === 'follow_up') {
        const followupId = item.context?.followupId;
        if (!followupId) {
          return;
        }
        if ((item.context?.followupType ?? '').toUpperCase() === 'APPOINTMENT') {
          setNoteDialog({
            id: followupId,
            title: item.title,
            appointmentMode: item.context?.appointmentMode ?? null,
            jobId: item.context?.jobId,
            contactId: item.context?.contactId
          });
          setNoteDraft('');
          return;
        }
        await completeFollowup({
          id: followupId,
          jobId: item.context?.jobId,
          contactId: item.context?.contactId
        });
        return;
      }
      if (item.type === 'task') {
        const taskId = item.context?.taskId;
        if (!taskId) {
          return;
        }
        await completeTask(taskId);
      }
    },
    [completeFollowup, completeTask]
  );

  const handleDialogSubmit = useCallback(async () => {
    if (!noteDialog) {
      return;
    }
    await completeFollowup({
      id: noteDialog.id,
      jobId: noteDialog.jobId,
      contactId: noteDialog.contactId,
      note: noteDraft.trim() || undefined
    });
    setNoteDialog(null);
    setNoteDraft('');
  }, [completeFollowup, noteDialog, noteDraft]);

  const handleDialogClose = useCallback(() => {
    setNoteDialog(null);
    setNoteDraft('');
  }, []);

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
        void handleMarkDone(queueItems[0]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [activeTab, queueItems, handleMarkDone]);

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
          {queueItems.map((item, index) => {
            const completable =
              (item.type === 'follow_up' && Boolean(item.context?.followupId)) ||
              (item.type === 'task' && Boolean(item.context?.taskId));
            const processing =
              processingKey !== null &&
              (processingKey === item.context?.followupId || processingKey === item.context?.taskId);
            const isAppointment =
              item.type === 'follow_up' && item.context?.followupType === 'APPOINTMENT';
            return (
              <li
                key={`${item.type}-${item.ctaLink}-${index}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {queueBadgeLabel(item)}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatDue(item.dueAt)}</span>
                  </div>
                  <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                  {isAppointment && (
                    <p className="truncate text-[11px] font-medium text-violet-600">
                      {appointmentLabel(item.context?.appointmentMode)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ActionButton label="Open" href={item.ctaLink} />
                  {completable && (
                    <button
                      type="button"
                      onClick={() => void handleMarkDone(item)}
                      disabled={processing}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAppointment ? 'Add notes' : 'Mark done'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
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
    <>
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
      <AppointmentNoteDialog
        pending={noteDialog}
        note={noteDraft}
        onNoteChange={setNoteDraft}
        onCancel={handleDialogClose}
        onSubmit={handleDialogSubmit}
        busy={Boolean(noteDialog && processingKey === noteDialog.id)}
      />
    </>
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

const ActionButton = ({ label, href }: { label: string; href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="rounded-md bg-brand px-2 py-1 text-xs font-semibold text-white transition hover:bg-brand-dark"
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

const queueBadgeLabel = (item: QueueItem) => {
  if (item.type === 'follow_up') {
    return item.context?.followupType === 'APPOINTMENT' ? 'Appointment' : 'Follow-up';
  }
  if (item.type === 'task') {
    return 'Task';
  }
  return 'Stale outreach';
};

const appointmentLabel = (mode?: string | null) => {
  switch (mode) {
    case 'ZOOM':
      return 'Zoom call';
    case 'MEETING':
      return 'Meeting';
    case 'PHONE':
      return 'Phone call';
    case 'ON_SITE':
      return 'On-site';
    default:
      return 'Appointment';
  }
};

const AppointmentNoteDialog = ({
  pending,
  note,
  onNoteChange,
  onCancel,
  onSubmit,
  busy
}: {
  pending: { id: string; title: string; appointmentMode?: string | null; jobId?: string; contactId?: string } | null;
  note: string;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  busy: boolean;
}) => (
  <Dialog.Root open={Boolean(pending)} onOpenChange={(open) => !open && onCancel()}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-slate-900/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Dialog.Title className="text-base font-semibold text-slate-900">
              Wrap up appointment
            </Dialog.Title>
            {pending && (
              <Dialog.Description className="text-sm text-slate-500">
                {appointmentLabel(pending.appointmentMode)} · {pending.title}
              </Dialog.Description>
            )}
          </div>
          <Dialog.Close className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-50">
            ✕
          </Dialog.Close>
        </div>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Notes (optional)
        </label>
        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Capture what was discussed or next steps…"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Mark done'}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
