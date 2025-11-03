import type { GrowthBoostTask } from '../../api/hooks';

interface BoostTaskCardProps {
  task: GrowthBoostTask;
  onStatusChange?: (taskId: string, status: GrowthBoostTask['status']) => void;
}

const categoryStyles: Record<GrowthBoostTask['category'], string> = {
  'skills-gap': 'bg-orange-100 text-orange-700',
  'network-gap': 'bg-rose-100 text-rose-700',
  'visibility-gap': 'bg-amber-100 text-amber-700'
};

const statusBadgeStyles: Record<GrowthBoostTask['status'], string> = {
  pending: 'bg-slate-200 text-slate-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700'
};

export const BoostTaskCard = ({ task, onStatusChange }: BoostTaskCardProps) => {
  const flames = Array.from({ length: task.impactLevel }, () => '🔥').join('');

  const handleToggle = () => {
    if (!onStatusChange) return;
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    onStatusChange(task.id, nextStatus);
  };

  return (
    <article className="flex h-full flex-col rounded-xl border border-orange-200 bg-orange-50/70 p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-orange-600">Boost Task</p>
          <h3 className="text-base font-semibold text-slate-900">{task.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeStyles[task.status]}`}>{task.status}</span>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${categoryStyles[task.category]}`}>
            {task.category.replace('-', ' ')}
          </span>
        </div>
      </header>
      {task.description && <p className="mt-3 text-sm text-slate-700">{task.description}</p>}
      <div className="mt-3 flex items-center justify-between text-sm font-semibold text-orange-600">
        <span>{flames || '🔥'}</span>
        {onStatusChange && (
          <button
            onClick={handleToggle}
            className="rounded-md border border-orange-300 bg-white px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            {task.status === 'completed' ? 'Reopen' : 'Mark completed'}
          </button>
        )}
      </div>
      {task.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {task.tags.map((tag) => (
            <span key={`${task.id}-${tag}`} className="rounded-full bg-white px-2 py-1 text-xs text-orange-700">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};
