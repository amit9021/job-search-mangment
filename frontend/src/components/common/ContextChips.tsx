import { useNavigate } from 'react-router-dom';

interface ContextChipsProps {
  job?: { id: string; company: string; role: string | null } | null;
  contact?: { id: string; name: string | null } | null;
  grow?: { type: string; id?: string | null } | null;
}

export const ContextChips = ({ job, contact, grow }: ContextChipsProps) => {
  const navigate = useNavigate();

  const chips: Array<{
    key: string;
    label: string;
    description?: string | null;
    onClick?: () => void;
  }> = [];

  if (job) {
    chips.push({
      key: `job-${job.id}`,
      label: job.company,
      description: job.role,
      onClick: () => navigate(`/jobs?focus=${job.id}`)
    });
  }

  if (contact) {
    chips.push({
      key: `contact-${contact.id}`,
      label: contact.name ?? 'Contact',
      onClick: () => navigate(`/contacts?focus=${contact.id}`)
    });
  }

  if (grow) {
    chips.push({
      key: `grow-${grow.type}-${grow.id ?? 'ref'}`,
      label: `Grow · ${grow.type}`,
      description: grow.id ?? undefined,
      onClick: () => navigate('/growth')
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={chip.onClick}
          type="button"
          className="group flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:border-brand hover:bg-white hover:text-brand"
        >
          <span>{chip.label}</span>
          {chip.description && (
            <span className="text-[10px] font-normal uppercase tracking-wide text-slate-400 group-hover:text-brand/70">
              {chip.description}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
