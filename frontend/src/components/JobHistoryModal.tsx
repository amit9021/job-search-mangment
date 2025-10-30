import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { useJobHistoryQuery } from '../api/hooks';

interface JobHistoryModalProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimelineItem = {
  id: string;
  date: string;
  label: string;
  description?: string;
};

export const JobHistoryModal = ({ jobId, open, onOpenChange }: JobHistoryModalProps) => {
  const { data, isLoading } = useJobHistoryQuery(jobId ?? '', { enabled: open && Boolean(jobId) });

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!data) {
      return [];
    }

    const items: TimelineItem[] = [];

    (data.statusHistory ?? []).forEach((entry) => {
      items.push({
        id: `status-${entry.id}`,
        date: entry.at,
        label: `Stage → ${entry.stage}`,
        description: entry.note ?? undefined
      });
    });

    (data.applications ?? []).forEach((application) => {
      items.push({
        id: `application-${application.id}`,
        date: application.dateSent,
        label: `Application sent (tailoring ${application.tailoringScore})`,
        description: application.cvVersionId ? `CV version: ${application.cvVersionId}` : undefined
      });
    });

    (data.outreaches ?? []).forEach((outreach) => {
      const contact = outreach.contact?.name ? ` → ${outreach.contact.name}` : '';
      items.push({
        id: `outreach-${outreach.id}`,
        date: outreach.sentAt,
        label: `Outreach via ${outreach.channel}${contact}`,
        description: [
          outreach.messageType,
          `Personalization ${outreach.personalizationScore}`,
          outreach.outcome !== 'NONE' ? `Outcome: ${outreach.outcome}` : null,
          outreach.content ? `Note: ${outreach.content}` : null
        ]
          .filter(Boolean)
          .join(' • ')
      });
    });

    (data.followups ?? []).forEach((followup) => {
      items.push({
        id: `followup-${followup.id}`,
        date: followup.dueAt,
        label: `Follow-up attempt ${followup.attemptNo}`,
        description: followup.sentAt
          ? `Completed ${format(new Date(followup.sentAt), 'MMM d, yyyy')}`
          : followup.note ?? undefined
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const jobTitle = data ? `${data.company} — ${data.role}` : 'Job history';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">Timeline</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">{jobTitle}</Dialog.Description>

          {isLoading && <p className="mt-4 text-sm text-slate-500">Loading timeline…</p>}

          {!isLoading && timeline.length === 0 && (
            <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No history recorded yet. Once you add applications, outreach, or status changes they will appear here.
            </p>
          )}

          {!isLoading && timeline.length > 0 && (
            <ul className="mt-5 space-y-4">
              {timeline.map((item) => (
                <li key={item.id} className="flex gap-4">
                  <span className="w-28 shrink-0 text-xs font-semibold uppercase text-slate-500">
                    {format(new Date(item.date), 'MMM d, yyyy')}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Close</button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
