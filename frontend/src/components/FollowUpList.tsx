import { format } from 'date-fns';

export type FollowUpItem = {
  id: string;
  dueAt: string;
  attemptNo: number;
  type: string;
  appointmentMode?: string | null;
  note?: string | null;
  job?: { id: string; company: string };
  contact?: { id: string; name: string };
};

interface FollowUpListProps {
  items: FollowUpItem[];
  onComplete?: (id: string) => void;
}

export const FollowUpList = ({ items, onComplete }: FollowUpListProps) => {
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

  if (!items.length) {
    return <p className="text-sm text-slate-500">No follow-ups for this filter. Great job staying current!</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {item.job ? item.job.company : item.contact?.name ?? 'General'}
            </p>
            {item.type === 'APPOINTMENT' ? (
              <p className="text-xs text-slate-500">
                {appointmentLabel(item.appointmentMode)} · {format(new Date(item.dueAt), 'PPpp')}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Attempt {item.attemptNo} · due {format(new Date(item.dueAt), 'PPpp')}
              </p>
            )}
            {item.type === 'APPOINTMENT' && item.note && (
              <p className="text-[11px] text-slate-400">{item.note}</p>
            )}
          </div>
          {onComplete && (
            <button
              onClick={() => onComplete(item.id)}
              className="rounded-md border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
            >
              Mark sent
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};
