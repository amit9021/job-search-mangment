import { format, formatDistanceToNow } from 'date-fns';
import { useMemo, useState } from 'react';
import { TaskModel } from '../../api/hooks';
import { ContextChips } from '../common/ContextChips';

const priorityStyles: Record<
  TaskModel['priority'],
  { badge: string; dot: string; label: string }
> = {
  Low: {
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Low'
  },
  Med: {
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    label: 'Medium'
  },
  High: {
    badge: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
    label: 'High'
  }
};

const statusPalette: Record<TaskModel['status'], string> = {
  Todo: 'bg-slate-100 text-slate-700',
  Doing: 'bg-blue-100 text-blue-700',
  Done: 'bg-emerald-100 text-emerald-700',
  Blocked: 'bg-rose-100 text-rose-700'
};

const snoozeOptions: Array<{ preset: '1h' | 'tonight' | 'tomorrow' | 'nextweek'; label: string }> = [
  { preset: '1h', label: '+1 hour' },
  { preset: 'tonight', label: 'Tonight 20:00' },
  { preset: 'tomorrow', label: 'Tomorrow 09:00' },
  { preset: 'nextweek', label: 'Next Monday 09:00' }
];

const formatDueLabel = (dueAt?: string | null) => {
  if (!dueAt) return 'No due date';
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return 'No due date';
  }
  const relative = formatDistanceToNow(due, { addSuffix: true });
  return `${format(due, 'MMM d, HH:mm')} · ${relative}`;
};

const deriveDueTone = (task: TaskModel) => {
  if (!task.dueAt) {
    return 'text-slate-400';
  }
  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) {
    return 'text-slate-400';
  }
  const now = new Date();
  if (task.status === 'Done') {
    return 'text-emerald-500';
  }
  if (due.getTime() < now.getTime()) {
    return 'text-rose-500';
  }
  const diff = due.getTime() - now.getTime();
  const sixHours = 6 * 60 * 60 * 1000;
  if (diff <= sixHours) {
    return 'text-amber-500';
  }
  return 'text-slate-500';
};

interface TaskCardProps {
  task: TaskModel;
  isSelected?: boolean;
  onSelect?: (taskId: string) => void;
  onToggleDone: (task: TaskModel) => void;
  onEdit: (task: TaskModel) => void;
  onDelete: (task: TaskModel) => void;
  onSnooze: (task: TaskModel, preset: '1h' | 'tonight' | 'tomorrow' | 'nextweek') => void;
  onUpdateTitle: (task: TaskModel, nextTitle: string) => void;
}

export const TaskCard = ({
  task,
  isSelected,
  onSelect,
  onToggleDone,
  onEdit,
  onDelete,
  onSnooze,
  onUpdateTitle
}: TaskCardProps) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  const checklistStats = useMemo(() => {
    const total = task.checklist?.length ?? 0;
    if (total === 0) {
      return null;
    }
    const done = task.checklist.filter((item) => item.done).length;
    return { done, total, progress: Math.round((done / total) * 100) };
  }, [task.checklist]);

  const priority = priorityStyles[task.priority];
  const dueTone = deriveDueTone(task);

  const handleTitleSubmit = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === task.title) {
      setTitleDraft(task.title);
      setEditingTitle(false);
      return;
    }
    onUpdateTitle(task, trimmed);
    setEditingTitle(false);
  };

  const toggleSelection = () => {
    onSelect?.(task.id);
  };

  return (
    <article
      tabIndex={0}
      onClick={toggleSelection}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          toggleSelection();
        }
      }}
      className={`group rounded-2xl border bg-white p-5 shadow-sm transition ${
        isSelected ? 'border-brand ring-2 ring-brand/40' : 'border-slate-200 hover:border-brand/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start gap-2">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priority.dot}`} />
            <div className="flex-1">
              {editingTitle ? (
                <input
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleTitleSubmit();
                    } else if (event.key === 'Escape') {
                      setTitleDraft(task.title);
                      setEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand"
                />
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingTitle(true);
                  }}
                  className="text-left text-sm font-semibold text-slate-800 hover:text-brand"
                >
                  {task.title}
                </button>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priority.badge}`}>
                  Priority · {priority.label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPalette[task.status]}`}>
                  {task.status}
                </span>
                {task.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={`mt-3 text-xs font-medium ${dueTone}`}>
            {formatDueLabel(task.dueAt)}
          </div>

          {task.description && (
            <p className="mt-2 text-sm text-slate-500 line-clamp-3">{task.description}</p>
          )}

          <div className="mt-3">
            <ContextChips job={task.context.job ?? undefined} contact={task.context.contact ?? undefined} grow={task.context.grow ?? undefined} />
          </div>

          {checklistStats && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-slate-400">
                <span>Checklist</span>
                <span>
                  {checklistStats.done}/{checklistStats.total}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${checklistStats.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleDone(task);
            }}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              task.status === 'Done'
                ? 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {task.status === 'Done' ? 'Reopen' : 'Mark done'}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSnoozeOpen((prev) => !prev);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
            >
              Snooze
            </button>
            {snoozeOpen && (
              <div className="absolute right-0 z-10 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {snoozeOptions.map((option) => (
                  <button
                    key={option.preset}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSnooze(task, option.preset);
                      setSnoozeOpen(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(task);
            }}
            className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-500 hover:text-brand"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              const confirmed = window.confirm('Delete this task?');
              if (confirmed) {
                onDelete(task);
              }
            }}
            className="rounded-lg px-3 py-1 text-xs font-semibold text-rose-500 hover:text-rose-600"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
};
