import * as Dialog from '@radix-ui/react-dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import {
  useJobHistoryQuery,
  useUpdateOutreachMutation,
  useDeleteOutreachMutation,
  useCreateJobNoteMutation,
  useUpdateJobNoteMutation,
  useDeleteJobNoteMutation,
  useMarkFollowupMutation,
  useDeleteFollowupMutation
} from '../api/hooks';

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
        id: string;
        attemptNo: number;
        sentAt?: string | null;
        note?: string | null;
        type?: string;
        appointmentMode?: string | null;
      };
      contact?: { id: string; name: string | null };
    }
  | {
      id: string;
      date: string;
      kind: 'note';
      note: {
        id: string;
        content: string;
        createdAt: string;
        updatedAt: string;
        authorEmail?: string | null;
      };
    };

const describeAppointment = (mode?: string | null) => {
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

export const JobHistoryModal = ({ jobId, open, onOpenChange, onOpenContact }: JobHistoryModalProps) => {
  const { data, isLoading } = useJobHistoryQuery(jobId ?? '', { enabled: open && Boolean(jobId) });
  const updateOutreach = useUpdateOutreachMutation();
  const deleteOutreach = useDeleteOutreachMutation();
  const createNote = useCreateJobNoteMutation();
  const updateNote = useUpdateJobNoteMutation();
  const removeNote = useDeleteJobNoteMutation();
  const markFollowup = useMarkFollowupMutation();
  const deleteFollowup = useDeleteFollowupMutation();
  const [noteDraft, setNoteDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [followupActionId, setFollowupActionId] = useState<string | null>(null);

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

  const handleFollowupComplete = async (followupId: string, contactId?: string) => {
    if (!jobId) {
      return;
    }
    setFollowupActionId(followupId);
    try {
      await markFollowup.mutateAsync({ id: followupId, jobId, contactId });
    } finally {
      setFollowupActionId(null);
    }
  };

  const handleFollowupDelete = async (followupId: string, contactId?: string) => {
    if (!jobId) {
      return;
    }
    const confirmed = window.confirm('Delete this follow-up?');
    if (!confirmed) {
      return;
    }
    setFollowupActionId(followupId);
    try {
      await deleteFollowup.mutateAsync({ id: followupId, jobId, contactId });
    } finally {
      setFollowupActionId(null);
    }
  };

  const resetNoteForm = () => {
    setNoteDraft('');
    setEditingNoteId(null);
  };

  useEffect(() => {
    if (!open) {
      resetNoteForm();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      resetNoteForm();
    }
  }, [jobId]);

  const isNotePending = createNote.isPending || updateNote.isPending;

  const handleSaveNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!jobId) {
      return;
    }
    if (isNotePending) {
      return;
    }
    const content = noteDraft.trim();
    if (!content) {
      return;
    }
    try {
      if (editingNoteId) {
        await updateNote.mutateAsync({ jobId, noteId: editingNoteId, content });
      } else {
        await createNote.mutateAsync({ jobId, content });
      }
      resetNoteForm();
    } catch {
      // toast handled in mutations
    }
  };

  const handleEditNote = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setNoteDraft(content);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!jobId) {
      return;
    }
    const confirmed = window.confirm('Delete this note?');
    if (!confirmed) {
      return;
    }
    try {
      await removeNote.mutateAsync({ jobId, noteId });
      if (editingNoteId === noteId) {
        resetNoteForm();
      }
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
          id: followup.id,
          attemptNo: followup.attemptNo,
          sentAt: followup.sentAt ?? null,
          note: followup.note ?? null,
          type: followup.type ?? undefined,
          appointmentMode: followup.appointmentMode ?? null
        },
        contact: followup.contact
          ? { id: followup.contact.id, name: followup.contact.name ?? null }
          : undefined
      });
    });

    (data.notes ?? []).forEach((note) => {
      const parsed = parseDate(note.createdAt);
      if (!parsed) {
        return;
      }
      items.push({
        id: `note-${note.id}`,
        date: parsed.toISOString(),
        kind: 'note',
        note: {
          id: note.id,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          authorEmail: note.user?.email ?? null
        }
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
        <Dialog.Content className="fixed inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <Dialog.Close
              className="absolute right-4 top-4 rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
              aria-label="Close timeline"
            >
              ✕
            </Dialog.Close>
            <Dialog.Title className="text-lg font-semibold text-slate-900 pr-8">Timeline</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500">{jobTitle}</Dialog.Description>

            {data && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Current stage</p>
                <p className="text-sm font-semibold text-slate-800 capitalize">{data.stage.toLowerCase()}</p>
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

          {jobId && (
            <form onSubmit={handleSaveNote} className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {editingNoteId ? 'Edit note' : 'Add note'}
                </p>
                {editingNoteId && (
                  <button
                    type="button"
                    onClick={resetNoteForm}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <textarea
                className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                rows={3}
                placeholder="Add a note about this opportunity…"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isNotePending || noteDraft.trim().length === 0}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isNotePending ? 'Saving…' : editingNoteId ? 'Update note' : 'Add note'}
                </button>
              </div>
            </form>
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

                        const isAppointmentFollowup =
                          item.kind === 'followup' && item.followup.type === 'APPOINTMENT';
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
                                  icon: isAppointmentFollowup ? '📅' : '⏰',
                                  label: isAppointmentFollowup ? 'Appointment' : 'Follow-up',
                                  title: isAppointmentFollowup
                                    ? describeAppointment(item.followup.appointmentMode)
                                    : `Follow-up attempt ${item.followup.attemptNo}`,
                                  chip: isAppointmentFollowup
                                    ? 'border border-violet-200 bg-violet-50 text-violet-700'
                                    : 'border border-amber-200 bg-amber-50 text-amber-700',
                                  iconTone: isAppointmentFollowup
                                    ? 'border border-violet-200 bg-violet-50 text-violet-700'
                                    : 'border border-amber-200 bg-amber-50 text-amber-700'
                                }
                              : item.kind === 'stage'
                                ? {
                                    icon: '🛤️',
                                    label: 'Stage update',
                                    title: `Stage → ${item.stage}`,
                                    chip: 'border border-indigo-200 bg-indigo-50 text-indigo-700',
                                    iconTone: 'border border-indigo-200 bg-indigo-50 text-indigo-700'
                                  }
                                : item.kind === 'note'
                                  ? {
                                      icon: '📝',
                                      label: 'Note',
                                      title: 'Note added',
                                      chip: 'border border-slate-200 bg-slate-50 text-slate-700',
                                      iconTone: 'border border-slate-200 bg-slate-50 text-slate-700'
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
                                  {item.followup.type === 'APPOINTMENT' ? (
                                    <div className="flex flex-wrap items-center gap-2 text-violet-700">
                                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase">
                                        Appointment
                                      </span>
                                      <span className="font-semibold">
                                        {describeAppointment(item.followup.appointmentMode)}
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="font-semibold text-slate-700">
                                      Attempt {item.followup.attemptNo}
                                    </p>
                                  )}
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
                                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                                    {!item.followup.sentAt && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleFollowupComplete(
                                            item.followup.id,
                                            item.contact?.id ?? undefined
                                          )
                                        }
                                        disabled={followupActionId === item.followup.id}
                                        className="rounded border border-emerald-300 px-2 py-0.5 font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                                      >
                                        {followupActionId === item.followup.id ? 'Marking…' : 'Mark done'}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleFollowupDelete(
                                          item.followup.id,
                                          item.contact?.id ?? undefined
                                        )
                                      }
                                      disabled={followupActionId === item.followup.id}
                                      className="rounded border border-slate-200 px-2 py-0.5 font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-60"
                                    >
                                      Delete
                                    </button>
                                  </div>
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

                              {item.kind === 'note' && (
                                <div className="space-y-2 text-xs text-slate-600">
                                  <p className="whitespace-pre-wrap rounded-md border border-slate-100 bg-white/60 p-3 text-sm text-slate-800">
                                    {item.note.content}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                    {item.note.authorEmail && (
                                      <span>By {item.note.authorEmail}</span>
                                    )}
                                    <span>
                                      Updated{' '}
                                      {formatDistanceToNow(new Date(item.note.updatedAt), {
                                        addSuffix: true
                                      })}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleEditNote(item.note.id, item.note.content)}
                                      className="font-semibold text-blue-600 hover:text-blue-700"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteNote(item.note.id)}
                                      className="font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
                                      disabled={removeNote.isPending}
                                    >
                                      Delete
                                    </button>
                                  </div>
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

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
