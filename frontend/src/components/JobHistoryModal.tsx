import * as Dialog from '@radix-ui/react-dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { useMemo, useState } from 'react';
import { useJobHistoryQuery, useUpdateOutreachMutation, useDeleteOutreachMutation } from '../api/hooks';
import { UpdateJobStageDialog } from './UpdateJobStageDialog';

interface JobHistoryModalProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenContact?: (contactId: string) => void;
}

type TimelineItem =
  | {
      id: string;
      date: string;
      kind: 'stage';
      stage: string;
      note?: string | null;
    }
  | {
      id: string;
      date: string;
      kind: 'application';
      tailoringScore: number;
      cvVersionId?: string | null;
    }
  | {
      id: string;
      date: string;
      kind: 'outreach';
      outreach: {
        id: string;
        channel: string;
        outcome: string;
        personalizationScore: number;
        messageType?: string | null;
        content?: string | null;
        context?: string | null;
      };
      contact?: { id: string; name: string | null };
    }
  | {
      id: string;
      date: string;
      kind: 'followup';
      followup: {
        attemptNo: number;
        sentAt?: string | null;
        note?: string | null;
      };
      contact?: { id: string; name: string | null };
    };

export const JobHistoryModal = ({ jobId, open, onOpenChange, onOpenContact }: JobHistoryModalProps) => {
  const { data, isLoading } = useJobHistoryQuery(jobId ?? '', { enabled: open && Boolean(jobId) });
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const updateOutreach = useUpdateOutreachMutation();
  const deleteOutreach = useDeleteOutreachMutation();

  const handleOutcomeChange = async (outreachId: string, outcome: string) => {
    try {
      await updateOutreach.mutateAsync({ id: outreachId, outcome });
    } catch {
      // toast handled in mutation
    }
  };

  const handleDeleteOutreach = async (outreachId: string) => {
    const confirmed = window.confirm(
      'Remove this outreach? This will unlink the contact from the job timeline.'
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteOutreach.mutateAsync({ id: outreachId });
    } catch {
      // toast handled in mutation
    }
  };

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!data) {
      return [];
    }

    const parseDate = (value?: string | null) => {
      if (!value) {
        return null;
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const items: TimelineItem[] = [];

    (data.statusHistory ?? []).forEach((entry) => {
      const parsed = parseDate(entry.at);
      if (!parsed) {
        return;
      }
      items.push({
        id: `status-${entry.id}`,
        date: parsed.toISOString(),
        kind: 'stage',
        stage: entry.stage,
        note: entry.note ?? null
      });
    });

    (data.applications ?? []).forEach((application) => {
      const parsed = parseDate(application.dateSent);
      if (!parsed) {
        return;
      }
      items.push({
        id: `application-${application.id}`,
        date: parsed.toISOString(),
        kind: 'application',
        tailoringScore: application.tailoringScore,
        cvVersionId: application.cvVersionId ?? null
      });
    });

    const humanize = (value?: string | null) => (value ? value.replace(/_/g, ' ') : undefined);

    const contextLabel = (context?: string | null) => {
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
      const parsed = parseDate(outreach.sentAt);
      if (!parsed) {
        return;
      }
      items.push({
        id: `outreach-${outreach.id}`,
        date: parsed.toISOString(),
        kind: 'outreach',
        outreach: {
          id: outreach.id,
          channel: outreach.channel,
          outcome: outreach.outcome,
          personalizationScore: outreach.personalizationScore,
          messageType: humanize(outreach.messageType),
          content: outreach.content ?? null,
          context: contextLabel(outreach.context)
        },
        contact: outreach.contact
          ? { id: outreach.contact.id, name: outreach.contact.name ?? null }
          : undefined
      });
    });

    (data.followups ?? []).forEach((followup) => {
      const parsed = parseDate(followup.dueAt);
      if (!parsed) {
        return;
      }
      items.push({
        id: `followup-${followup.id}`,
        date: parsed.toISOString(),
        kind: 'followup',
        followup: {
          attemptNo: followup.attemptNo,
          sentAt: followup.sentAt ?? null,
          note: followup.note ?? null
        },
        contact: followup.contact
          ? { id: followup.contact.id, name: followup.contact.name ?? null }
          : undefined
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const groupedTimeline = useMemo(() => {
    const groups: Array<{ day: string; entries: TimelineItem[] }> = [];

    timeline.forEach((item) => {
      const parsed = new Date(item.date);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      const dayKey = format(parsed, 'yyyy-MM-dd');
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.day === dayKey) {
        lastGroup.entries.push(item);
      } else {
        groups.push({ day: dayKey, entries: [item] });
      }
    });
    return groups;
  }, [timeline]);

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
            <div className="mt-5 space-y-6">
              {groupedTimeline.map((group) => {
                const dayDate = new Date(group.day);
                const dayLabel = Number.isNaN(dayDate.getTime())
                  ? group.day
                  : format(dayDate, 'EEEE, MMM d');

                return (
                  <section key={group.day} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {dayLabel}
                      </p>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <ul className="space-y-3">
                      {group.entries.map((item) => {
                        const parsedDate = new Date(item.date);
                        const timeLabel = Number.isNaN(parsedDate.getTime())
                          ? ''
                          : format(parsedDate, 'p');

                        const meta =
                          item.kind === 'outreach'
                            ? {
                                icon: '✉️',
                                label: 'Outreach',
                                title: `Outreach via ${item.outreach.channel}`,
                                chip: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
                                iconTone: 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                              }
                            : item.kind === 'followup'
                              ? {
                                  icon: '⏰',
                                  label: 'Follow-up',
                                  title: `Follow-up attempt ${item.followup.attemptNo}`,
                                  chip: 'border border-amber-200 bg-amber-50 text-amber-700',
                                  iconTone: 'border border-amber-200 bg-amber-50 text-amber-700'
                                }
                              : item.kind === 'stage'
                                ? {
                                    icon: '🛤️',
                                    label: 'Stage update',
                                    title: `Stage → ${item.stage}`,
                                    chip: 'border border-indigo-200 bg-indigo-50 text-indigo-700',
                                    iconTone: 'border border-indigo-200 bg-indigo-50 text-indigo-700'
                                  }
                                : {
                                    icon: '📄',
                                    label: 'Application',
                                    title: 'Application submitted',
                                    chip: 'border border-blue-200 bg-blue-50 text-blue-700',
                                    iconTone: 'border border-blue-200 bg-blue-50 text-blue-700'
                                  };

                        return (
                          <li
                            key={item.id}
                            className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${meta.iconTone}`}
                              aria-hidden="true"
                            >
                              {meta.icon}
                            </span>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${meta.chip}`}
                                >
                                  {meta.label}
                                </span>
                                {timeLabel && (
                                  <span className="text-xs font-medium text-slate-400">
                                    {timeLabel}
                                  </span>
                                )}
                                {'contact' in item && item.contact?.id && (
                                  <button
                                    type="button"
                                    onClick={() => item.contact?.id && onOpenContact?.(item.contact.id)}
                                    className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                                  >
                                    {item.contact?.name ?? 'View contact'}
                                  </button>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-900">{meta.title}</p>

                              {item.kind === 'outreach' && (
                                <div className="space-y-3 text-xs text-slate-600">
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                      Channel
                                    </span>
                                    <span className="text-sm font-medium text-slate-700">
                                      {item.outreach.channel.toLowerCase()}
                                    </span>
                                    {item.outreach.messageType && (
                                      <span>Message: {item.outreach.messageType}</span>
                                    )}
                                    <span>Personalization: {item.outreach.personalizationScore}</span>
                                    {item.outreach.context && (
                                      <span>Context: {item.outreach.context}</span>
                                    )}
                                  </div>
                                  {item.outreach.content && (
                                    <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                                      {item.outreach.content}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <label
                                      className="font-semibold text-slate-600"
                                      htmlFor={`outreach-outcome-${item.outreach.id}`}
                                    >
                                      Outcome
                                    </label>
                                    <select
                                      id={`outreach-outcome-${item.outreach.id}`}
                                      value={item.outreach.outcome}
                                      onChange={(event) =>
                                        handleOutcomeChange(item.outreach.id, event.target.value)
                                      }
                                      disabled={updateOutreach.isPending}
                                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs uppercase tracking-wide text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
                                    >
                                      <option value="NONE">Not set</option>
                                      <option value="NO_RESPONSE">No response</option>
                                      <option value="POSITIVE">Positive</option>
                                      <option value="NEGATIVE">Negative</option>
                                    </select>
                                    {updateOutreach.isPending && (
                                      <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                        Saving…
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOutreach(item.outreach.id)}
                                      disabled={deleteOutreach.isPending}
                                      className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
                                    >
                                      🗑 Delete outreach
                                    </button>
                                  </div>
                                </div>
                              )}

                              {item.kind === 'followup' && (
                                <div className="space-y-2 text-xs text-slate-600">
                                  {(() => {
                                    const dueDate = new Date(item.date);
                                    const dueLabel = Number.isNaN(dueDate.getTime())
                                      ? 'Unknown due date'
                                      : `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`;
                                    const completed = item.followup.sentAt
                                      ? new Date(item.followup.sentAt)
                                      : null;
                                    const completedLabel =
                                      completed && !Number.isNaN(completed.getTime())
                                        ? `Completed ${formatDistanceToNow(completed, { addSuffix: true })}`
                                        : null;
                                    const statusLabel = completedLabel ?? dueLabel;
                                    const statusTone =
                                      completedLabel !== null
                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border border-amber-200 bg-amber-50 text-amber-700';
                                    return (
                                      <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone}`}
                                      >
                                        {completedLabel ? '✅ ' : '⏳ '}
                                        {statusLabel}
                                      </span>
                                    );
                                  })()}
                                  {item.followup.note && (
                                    <p className="text-xs text-slate-500">{item.followup.note}</p>
                                  )}
                                </div>
                              )}

                              {item.kind === 'stage' && (
                                <div className="text-xs text-slate-600">
                                  <p className="text-xs text-slate-500">
                                    Stage updated to{' '}
                                    <span className="font-semibold text-slate-700">
                                      {item.stage.toLowerCase()}
                                    </span>
                                  </p>
                                  {item.note && (
                                    <p className="mt-1 rounded-md border border-slate-100 bg-slate-50 p-2 text-xs text-slate-500">
                                      {item.note}
                                    </p>
                                  )}
                                </div>
                              )}

                              {item.kind === 'application' && (
                                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                                  <span>
                                    Tailoring score:{' '}
                                    <span className="font-semibold text-slate-800">
                                      {item.tailoringScore}
                                    </span>
                                  </span>
                                  {item.cvVersionId && (
                                    <span>CV version: {item.cvVersionId}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
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
