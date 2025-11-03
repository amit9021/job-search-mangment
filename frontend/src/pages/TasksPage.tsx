import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TaskModel,
  TaskView,
  useTaskDeleteMutation,
  useTaskKpisQuery,
  useTaskSnoozeMutation,
  useTasksQuery,
  useTaskUpdateMutation
} from '../api/hooks';
import { QuickAddBar, QuickAddBarHandle } from '../components/tasks/QuickAddBar';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskDrawer } from '../components/tasks/TaskDrawer';
import { NBABox } from '../components/tasks/NBABox';

const views: Array<{ label: string; value: TaskView }> = [
  { label: 'Today', value: 'today' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Backlog', value: 'backlog' },
  { label: 'Completed', value: 'completed' }
];

const priorityFilters = ['all', 'High', 'Med', 'Low'] as const;

export const TasksPage = () => {
  const [view, setView] = useState<TaskView>('today');
  const [priority, setPriority] = useState<(typeof priorityFilters)[number]>('all');
  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const quickAddRef = useRef<QuickAddBarHandle | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { data: taskList = [], isLoading } = useTasksQuery({ view, search, priority });
  const { data: kpis } = useTaskKpisQuery();
  const updateTask = useTaskUpdateMutation();
  const deleteTask = useTaskDeleteMutation();
  const snoozeTask = useTaskSnoozeMutation();

  const selectedTask = useMemo<TaskModel | null>(() => {
    if (!selectedTaskId) return null;
    return taskList.find((task) => task.id === selectedTaskId) ?? null;
  }, [selectedTaskId, taskList]);

  useEffect(() => {
    if (taskList.length === 0) {
      setSelectedTaskId(null);
    } else if (selectedTaskId) {
      const stillExists = taskList.some((task) => task.id === selectedTaskId);
      if (!stillExists) {
        setSelectedTaskId(taskList[0].id);
      }
    }
  }, [taskList, selectedTaskId]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isFormElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.getAttribute('contenteditable') === 'true';

      if (event.key === 't' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        quickAddRef.current?.focus();
        return;
      }

      if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!selectedTask) {
        return;
      }

      if (isFormElement) {
        return;
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        onToggleDone(selectedTask);
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSnooze(selectedTask, 'tomorrow');
      } else if (event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setDrawerOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [selectedTask]);

  const onToggleDone = (task: TaskModel) => {
    const nextStatus = task.status === 'Done' ? 'Todo' : 'Done';
    updateTask.mutate({ id: task.id, updates: { status: nextStatus } });
  };

  const onSnooze = (task: TaskModel, preset: '1h' | 'tonight' | 'tomorrow' | 'nextweek') => {
    snoozeTask.mutate({ id: task.id, preset });
  };

  const onDelete = (task: TaskModel) => {
    deleteTask.mutate(task.id);
    if (selectedTaskId === task.id) {
      setSelectedTaskId(null);
    }
  };

  const onUpdateTitle = (task: TaskModel, title: string) => {
    updateTask.mutate({ id: task.id, updates: { title } });
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
            <p className="text-sm text-slate-500">Plan the day, run the day.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiTile label="Due today" value={kpis?.dueToday ?? 0} tone="text-emerald-600" />
            <KpiTile label="Overdue" value={kpis?.overdue ?? 0} tone="text-rose-600" />
            <KpiTile label="Velocity (7d)" value={kpis?.velocity7d ?? 0} tone="text-blue-600" />
            <KpiTile label="Streak" value={kpis?.streak ?? 0} tone="text-amber-600" />
          </div>
        </div>
      </header>

      <QuickAddBar ref={quickAddRef} />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {views.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setView(option.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    view === option.value
                      ? 'bg-brand text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
              />
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as (typeof priorityFilters)[number])}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
              >
                <option value="all">All priorities</option>
                <option value="High">High</option>
                <option value="Med">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading && <p className="text-sm text-slate-500">Loading tasks…</p>}
            {!isLoading && taskList.length === 0 && (
              <p className="text-sm text-slate-500">
                No tasks in this view yet. Use the quick add bar above to capture something.
              </p>
            )}
            {taskList.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onSelect={(id) => setSelectedTaskId(id)}
                onToggleDone={onToggleDone}
                onEdit={(next) => {
                  setSelectedTaskId(next.id);
                  setDrawerOpen(true);
                }}
                onDelete={onDelete}
                onSnooze={onSnooze}
                onUpdateTitle={onUpdateTitle}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <NBABox />
          {selectedTask && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">Focused task</h3>
              <p className="mt-2 text-sm text-slate-800">{selectedTask.title}</p>
              {selectedTask.description && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-4">{selectedTask.description}</p>
              )}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="mt-4 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
              >
                Open details
              </button>
            </div>
          )}
        </aside>
      </div>

      <TaskDrawer
        open={drawerOpen}
        task={selectedTask}
        onClose={() => setDrawerOpen(false)}
        isSaving={updateTask.isPending}
        onSubmit={async (id, updates) => {
          await updateTask.mutateAsync({ id, updates });
        }}
      />
    </div>
  );
};

interface KpiTileProps {
  label: string;
  value: number;
  tone: string;
}

const KpiTile = ({ label, value, tone }: KpiTileProps) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
    <div className={`mt-1 text-xl font-semibold ${tone}`}>{value}</div>
  </div>
);
