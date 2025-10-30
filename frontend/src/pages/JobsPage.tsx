import { formatDistanceToNow } from 'date-fns';
import { useJobsQuery } from '../api/hooks';
import { HeatBadge } from '../components/HeatBadge';
import { JobWizardModal } from '../components/JobWizardModal';

const columns: Array<{ stage: string; title: string }> = [
  { stage: 'APPLIED', title: 'Applied' },
  { stage: 'HR', title: 'HR' },
  { stage: 'TECH', title: 'Tech' },
  { stage: 'OFFER', title: 'Offer' }
];

export const JobsPage = () => {
  const { data: jobs, isLoading } = useJobsQuery();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Pipeline</h2>
          <p className="text-sm text-slate-500">Keep heat high by touching each role every 3 days.</p>
        </div>
        <JobWizardModal />
      </div>
      {isLoading && <p className="text-sm text-slate-500">Loading jobs…</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <div key={column.stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">{column.title}</h3>
              <span className="text-xs text-slate-400">
                {(jobs ?? []).filter((job) => job.stage === column.stage).length}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {(jobs ?? [])
                .filter((job) => job.stage === column.stage)
                .map((job) => (
                  <article key={job.id} className="rounded-xl border border-white bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{job.company}</h4>
                        <p className="text-xs text-slate-500">{job.role}</p>
                      </div>
                      <HeatBadge heat={job.heat} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Updated {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-slate-400">
                      Last touch {formatDistanceToNow(new Date(job.lastTouchAt), { addSuffix: true })}
                    </p>
                  </article>
                ))}
              {(jobs ?? []).filter((job) => job.stage === column.stage).length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-400">
                  No items yet.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
