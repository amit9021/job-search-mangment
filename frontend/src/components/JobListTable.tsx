import { differenceInCalendarDays, formatDistanceToNow } from 'date-fns';
import { HeatBadge } from './HeatBadge';

type JobRow = {
  id: string;
  company: string;
  role: string;
  stage: string;
  heat: number;
  lastTouchAt: string;
  nextFollowUpAt?: string | null;
  sourceUrl?: string | null;
  contactsCount: number;
  contacts: Array<{
    id: string;
    name: string | null;
    role?: string | null;
  }>;
};

interface JobListTableProps {
  jobs: JobRow[];
  onEdit: (jobId: string) => void;
  onDelete: (job: { id: string; company: string; role: string }) => void;
  onHistory: (jobId: string) => void;
  onAddOutreach: (job: JobRow) => void;
  onChangeStage: (job: JobRow) => void;
  onOpenContact: (contactId?: string | null) => void;
}

const formatRelative = (dateString?: string | null) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return formatDistanceToNow(date, { addSuffix: true });
};

const formatFollowUpCountdown = (dateString?: string | null) => {
  if (!dateString) return '—';
  const dueDate = new Date(dateString);
  if (Number.isNaN(dueDate.getTime())) {
    return '—';
  }
  const diff = Math.abs(differenceInCalendarDays(dueDate, new Date()));
  if (diff === 0) {
    return 'Today';
  }
  return `${diff} day${diff === 1 ? '' : 's'}`;
};

export const JobListTable = ({
  jobs,
  onEdit,
  onDelete,
  onHistory,
  onAddOutreach,
  onChangeStage,
  onOpenContact
}: JobListTableProps) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Company</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Stage</th>
            <th className="px-4 py-3 text-left">Heat</th>
            <th className="px-4 py-3 text-left">Contacts</th>
            <th className="px-4 py-3 text-left">Last touch</th>
            <th className="px-4 py-3 text-left">Next follow-up</th>
            <th className="px-4 py-3 text-left">Source</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{job.company}</td>
              <td className="px-4 py-3 text-slate-600">{job.role}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onChangeStage(job)}
                  className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium capitalize text-slate-700 hover:border-blue-400 hover:text-blue-600"
                >
                  {job.stage.toLowerCase()}
                </button>
              </td>
              <td className="px-4 py-3">
                <HeatBadge heat={job.heat} jobId={job.id} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {job.contacts.length === 0 ? (
                  <span className="text-xs text-slate-400">—</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {job.contacts.map((contact) => (
                      <button
                        key={`${job.id}-${contact.id}`}
                        type="button"
                        onClick={() => onOpenContact(contact.id)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                      >
                        {contact.name ?? 'Unnamed contact'}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-slate-400">Total: {job.contactsCount}</div>
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs">{formatRelative(job.lastTouchAt)}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">
                {formatFollowUpCountdown(job.nextFollowUpAt ?? undefined)}
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs">
                {job.sourceUrl ? (
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(job.id)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onHistory(job.id)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    History
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddOutreach(job)}
                    className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                  >
                    Add outreach
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete({ id: job.id, company: job.company, role: job.role })}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                No jobs match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
