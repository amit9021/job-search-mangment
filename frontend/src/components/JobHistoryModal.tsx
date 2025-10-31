import * as Dialog from '@radix-ui/react-dialog';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useJobHistoryQuery } from '../api/hooks';
import { UpdateJobStageDialog } from './UpdateJobStageDialog';

interface JobHistoryModalProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenContact?: (contactId: string) => void;
}

type TimelineItem = {
  id: string;
  date: string;
  label: string;
  description?: string;
  contact?: { id: string; name: string | null };
};

export const JobHistoryModal = ({ jobId, open, onOpenChange, onOpenContact }: JobHistoryModalProps) => {
  const { data, isLoading } = useJobHistoryQuery(jobId ?? '', { enabled: open && Boolean(jobId) });
  const [stageDialogOpen, setStageDialogOpen] = useState(false);

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

    const contextLabel = (context?: string) => {
      switch (context) {
        case 'JOB_OPPORTUNITY':
          return 'Job outreach';
        case 'CODE_REVIEW':
          return 'Code review';
        case 'CHECK_IN':
          return 'Personal check-in';
        case 'REFERRAL_REQUEST':
          return 'Referral request';
        case 'OTHER':
        default:
          return undefined;
      }
    };

    (data.outreaches ?? []).forEach((outreach) => {
      const contactName = outreach.contact?.name ?? null;
      const contactSuffix = contactName ? ` → ${contactName}` : '';
      items.push({
        id: `outreach-${outreach.id}`,
        date: outreach.sentAt,
        label: `Outreach via ${outreach.channel}${contactSuffix}`,
        description: [
          outreach.messageType,
          `Personalization ${outreach.personalizationScore}`,
          outreach.outcome !== 'NONE' ? `Outcome: ${outreach.outcome}` : null,
          outreach.content ? `Note: ${outreach.content}` : null,
          contextLabel(outreach.context) ? `Context: ${contextLabel(outreach.context)}` : null
        ]
          .filter(Boolean)
          .join(' • '),
        contact: outreach.contact
      });
    });

    (data.followups ?? []).forEach((followup) => {
      const contactName = followup.contact?.name ?? null;
      const suffix = contactName ? ` → ${contactName}` : '';
      items.push({
        id: `followup-${followup.id}`,
        date: followup.dueAt,
        label: `Follow-up attempt ${followup.attemptNo}${suffix}`,
        description: followup.sentAt
          ? `Completed ${format(new Date(followup.sentAt), 'MMM d, yyyy')}`
          : followup.note ?? undefined,
        contact: followup.contact
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const linkedContacts = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { id: string; name: string | null }>();
    (data.outreaches ?? []).forEach((outreach) => {
      if (outreach.contact?.id) {
        map.set(outreach.contact.id, {
          id: outreach.contact.id,
          name: outreach.contact.name ?? 'Unnamed contact'
        });
      }
    });
    return Array.from(map.values());
  }, [data]);

  const jobTitle = data ? `${data.company} — ${data.role}` : 'Job history';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">Timeline</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">{jobTitle}</Dialog.Description>

          {data && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Current stage</p>
                <p className="text-sm font-semibold text-slate-800 capitalize">{data.stage.toLowerCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setStageDialogOpen(true)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600"
              >
                Update stage
              </button>
            </div>
          )}

          {linkedContacts.length > 0 && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs font-semibold uppercase text-blue-700">Linked contacts</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {linkedContacts.map((contact) => (
                  <button
                    type="button"
                    key={contact.id}
                    onClick={() => contact.id && onOpenContact?.(contact.id)}
                    className="rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {contact.name ?? 'Unnamed contact'}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                    {item.contact?.id && (
                      <button
                        type="button"
                        onClick={() => item.contact?.id && onOpenContact?.(item.contact.id)}
                        className="mt-1 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                      >
                        View contact
                      </button>
                    )}
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

          {jobId && data && (
            <UpdateJobStageDialog
              jobId={jobId}
              currentStage={data.stage}
              open={stageDialogOpen}
              onOpenChange={(open) => setStageDialogOpen(open)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
