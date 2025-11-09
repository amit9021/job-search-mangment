import { differenceInCalendarDays, formatDistanceToNow, isSameDay, startOfDay } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState, KeyboardEvent, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useJobsQuery, useDeleteJobMutation } from '../api/hooks';
import { HeatBadge } from '../components/HeatBadge';
import { JobWizardModal } from '../components/JobWizardModal';
import { JobHistoryModal } from '../components/JobHistoryModal';
import { AddOutreachDialog } from '../components/AddOutreachDialog';
import { JobListTable } from '../components/JobListTable';
import { UpdateJobStageDialog } from '../components/UpdateJobStageDialog';
import { ContactDrawer } from '../components/ContactDrawer';
import { KpiHeader } from '../components/KpiHeader';

type JobListItem = {
  id: string;
  company: string;
  role: string;
  stage: string;
  heat: number;
  updatedAt: string;
  lastTouchAt: string;
  nextFollowUpAt?: string | null;
  sourceUrl?: string | null;
  archived: boolean;
  contactsCount: number;
  contacts?: Array<{ id: string; name: string | null; role?: string | null }>;
};

const columns: Array<{ stage: string; title: string }> = [
  { stage: 'APPLIED', title: 'Applied' },
  { stage: 'HR', title: 'HR' },
  { stage: 'TECH', title: 'Tech' },
  { stage: 'OFFER', title: 'Offer' }
];

const archivedStages = ['REJECTED', 'DORMANT'];
const stageOrder = columns.map((column) => column.stage);

const heatPalette: Record<
  number,
  {
    base: string;
    border: string;
    progress: string;
    bubble: string;
    bubbleText: string;
    icon: string;
    label: string;
  }
> = {
  0: {
    base: 'bg-slate-50',
    border: 'border-slate-100',
    progress: 'bg-slate-300',
    bubble: 'bg-slate-200',
    bubbleText: 'text-slate-700',
    icon: '🧊',
    label: 'Cold'
  },
  1: {
    base: 'bg-amber-50',
    border: 'border-amber-200',
    progress: 'bg-amber-400',
    bubble: 'bg-amber-100',
    bubbleText: 'text-amber-700',
    icon: '🌤',
    label: 'Warming'
  },
  2: {
    base: 'bg-orange-50',
    border: 'border-orange-200',
    progress: 'bg-orange-400',
    bubble: 'bg-orange-100',
    bubbleText: 'text-orange-700',
    icon: '🔥',
    label: 'Hot'
  },
  3: {
    base: 'bg-rose-50',
    border: 'border-rose-200',
    progress: 'bg-rose-500',
    bubble: 'bg-rose-100',
    bubbleText: 'text-rose-700',
    icon: '🚀',
    label: 'Blazing'
  }
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

export const JobsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showArchived, setShowArchived] = useState(false);

  const heatParam = searchParams.get('heat');
  const parsedHeat = heatParam !== null && heatParam !== '' ? Number(heatParam) : undefined;
  const heatFilter = Number.isFinite(parsedHeat) ? (parsedHeat as number) : undefined;
  const followupsFilter = searchParams.get('followups');
  const initialViewParam = searchParams.get('view');

  const [viewMode, setViewModeState] = useState<'pipeline' | 'table'>(
    initialViewParam === 'table' ? 'table' : 'pipeline'
  );

  const setViewMode = useCallback(
    (mode: 'pipeline' | 'table') => {
      setViewModeState(mode);
      const next = new URLSearchParams(searchParams);
      if (mode === 'pipeline') {
        next.delete('view');
      } else {
        next.set('view', 'table');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const { data: allJobs, isLoading } = useJobsQuery({
    includeArchived: showArchived,
    heat: heatFilter
  });
  const deleteJob = useDeleteJobMutation();
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [jobPendingDelete, setJobPendingDelete] = useState<{
    id: string;
    company: string;
    role: string;
  } | null>(null);
  const [historyJobId, setHistoryJobId] = useState<string | null>(null);
  const [outreachJob, setOutreachJob] = useState<JobListItem | null>(null);
  const [stageJob, setStageJob] = useState<{
    id: string;
    company: string;
    role: string;
    stage: string;
  } | null>(null);
  const [focusContactId, setFocusContactId] = useState<string | null>(null);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [actionsJob, setActionsJob] = useState<JobListItem | null>(null);

  const handleOpenContact = (contactId?: string | null) => {
    if (!contactId) {
      return;
    }
    setFocusContactId(contactId);
    setContactDrawerOpen(true);
  };

  const handleEdit = (jobId: string) => {
    setEditingJobId(jobId);
    setEditModalOpen(true);
  };

  const handleDelete = (job: { id: string; company: string; role: string }) => {
    setJobPendingDelete(job);
  };

  const handleDeleteConfirm = async (mode: 'soft' | 'hard') => {
    if (!jobPendingDelete) return;
    try {
      await deleteJob.mutateAsync({ id: jobPendingDelete.id, hard: mode === 'hard' });
      setJobPendingDelete(null);
    } catch {
      // keep dialog open so the user can retry or cancel
    }
  };

  const archivedJobs = useMemo(
    () =>
      (allJobs ?? []).filter(
        (job) => job.archived || archivedStages.includes(job.stage)
      ),
    [allJobs]
  );

  useEffect(() => {
    const focusId = searchParams.get('focus');
    if (!focusId || !allJobs || allJobs.length === 0) {
      return;
    }
    const jobExists = allJobs.some((job) => job.id === focusId);
    if (jobExists) {
      setHistoryJobId(focusId);
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, allJobs, setSearchParams]);

  const activeJobs = useMemo(
    () =>
      (allJobs ?? []).filter(
        (job) => !(job.archived || archivedStages.includes(job.stage))
      ),
    [allJobs]
  );

  const filteredActiveJobs = useMemo(() => {
    let list = activeJobs;
    if (followupsFilter === 'overdue' || followupsFilter === 'today') {
      const todayStart = startOfDay(new Date());
      list = list.filter((job) => {
        if (!job.nextFollowUpAt) {
          return false;
        }
        const dueDate = new Date(job.nextFollowUpAt);
        if (Number.isNaN(dueDate.getTime())) {
          return false;
        }
        if (followupsFilter === 'overdue') {
          return dueDate.getTime() < todayStart.getTime();
        }
        return isSameDay(dueDate, todayStart);
      });
    }
    return list;
  }, [activeJobs, followupsFilter]);

  useEffect(() => {
    if (heatFilter !== undefined || followupsFilter) {
      if (viewMode !== 'table') {
        setViewMode('table');
      }
    }
  }, [heatFilter, followupsFilter, viewMode, setViewMode]);

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('heat');
    next.delete('followups');
    next.delete('view');
    setViewModeState('pipeline');
    setSearchParams(next, { replace: true });
  };

  const openJobActions = (job: JobListItem) => {
    setActionsJob(job);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, job: JobListItem) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openJobActions(job);
    }
  };

  const buildActionSummary = (job: JobListItem) => {
    const palette = heatPalette[job.heat] ?? heatPalette[0];
    const pieces: string[] = [`${palette.icon} ${palette.label}`];

    const contactsTotal =
      typeof job.contactsCount === 'number'
        ? job.contactsCount
        : job.contacts
          ? job.contacts.length
          : 0;
    pieces.push(`${contactsTotal} contact${contactsTotal === 1 ? '' : 's'}`);

    const lastTouchDate = new Date(job.lastTouchAt);
    if (!Number.isNaN(lastTouchDate.getTime())) {
      pieces.push(`Last touch ${formatDistanceToNow(lastTouchDate, { addSuffix: true })}`);
    }

    if (job.nextFollowUpAt) {
      const countdown = formatFollowUpCountdown(job.nextFollowUpAt);
      if (countdown !== '—') {
        pieces.push(`Next follow-up in ${countdown}`);
      }
    }

    return pieces.join(' · ');
  };

  const renderJobCard = (job: JobListItem) => (
    (() => {
      const palette = heatPalette[job.heat] ?? heatPalette[0];
      const stageIndex = stageOrder.indexOf(job.stage);
      const progressPercent =
        stageIndex < 0 ? 0 : Math.round(((stageIndex + 1) / stageOrder.length) * 100);
      const lastTouchDate = new Date(job.lastTouchAt);
      const lastTouchLabel = Number.isNaN(lastTouchDate.getTime())
        ? 'Unknown'
        : formatDistanceToNow(lastTouchDate, { addSuffix: true });
      const followUpLabel = job.nextFollowUpAt
        ? formatFollowUpCountdown(job.nextFollowUpAt)
        : null;

      return (
        <article
          key={job.id}
          className={`group relative flex cursor-pointer flex-col gap-3 rounded-2xl border ${palette.border} ${palette.base} p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-400 focus:outline-none`}
          role="button"
          tabIndex={0}
          onClick={() => openJobActions(job)}
          onKeyDown={(event) => handleCardKeyDown(event, job)}
          style={{ backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-slate-900">{job.company}</h4>
              <p className="text-sm text-slate-500">{job.role}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {followUpLabel && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${palette.bubble} ${palette.bubbleText}`}
                >
                  ⏱ Next in {followUpLabel}
                </span>
              )}
              <div
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                role="presentation"
              >
                <HeatBadge heat={job.heat} jobId={job.id} />
              </div>
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-500">
            <p className="font-semibold uppercase tracking-wide text-slate-400">Pipeline</p>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
              <span>{job.stage.toLowerCase()}</span>
              <span>Last touch {lastTouchLabel}</span>
            </div>
            <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${palette.progress}`}
                style={{ width: `${progressPercent}%`, minWidth: progressPercent > 0 ? '16%' : '0%' }}
              />
            </div>
          </div>

          {job.contacts && job.contacts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {job.contacts.map((contact) => (
                <button
                  key={`${job.id}-${contact.id}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenContact(contact.id);
                  }}
                  className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  {contact.name ?? 'Unnamed contact'}
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleEdit(job.id);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 transition hover:border-blue-300 hover:text-blue-600"
              title="Edit job"
            >
              ✏️ Edit
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setHistoryJobId(job.id);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 transition hover:border-violet-300 hover:text-violet-600"
              title="View history"
            >
              👁 History
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setOutreachJob({
                  ...job,
                  sourceUrl: job.sourceUrl ?? undefined
                });
              }}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 transition hover:border-emerald-300 hover:text-emerald-600"
              title="Add outreach"
            >
              ✉️ Outreach
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(job);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 transition hover:border-red-300 hover:text-red-600"
              title="Delete job"
            >
              🗑 Remove
            </button>
          </div>
        </article>
      );
    })()
  );

  const jobs = allJobs ?? [];
  const hasActiveFilter = heatFilter !== undefined || Boolean(followupsFilter);
  const visibleActiveJobs = filteredActiveJobs;

  return (
    <div className="space-y-6">
      <KpiHeader
        jobs={jobs.map((job) => ({
          id: job.id,
          stage: job.stage,
          heat: job.heat,
          archived: job.archived,
          nextFollowUpAt: job.nextFollowUpAt ?? null
        }))}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Pipeline</h2>
          <p className="text-sm text-slate-500">Keep heat high by touching each role every 3 days.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilter && (
            <div className="flex flex-wrap items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <span>Filters:</span>
              {heatFilter !== undefined && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                  Heat {heatFilter}
                </span>
              )}
              {followupsFilter && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                  Follow-ups {followupsFilter === 'overdue' ? 'Overdue' : 'Due today'}
                </span>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-brand underline-offset-2 hover:underline"
              >
                Clear
              </button>
            </div>
          )}
          <div className="flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`rounded-full px-3 py-1 transition ${
                viewMode === 'pipeline' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
              }`}
            >
              Pipeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded-full px-3 py-1 transition ${
                viewMode === 'table' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
              }`}
            >
              Table
            </button>
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
          <JobWizardModal />
        </div>
      </div>
      {isLoading && <p className="text-sm text-slate-500">Loading jobs…</p>}

      {/* Edit Modal */}
      {editingJobId && (
        <JobWizardModal
          jobId={editingJobId}
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) setEditingJobId(null);
          }}
        />
      )}
      {viewMode === 'pipeline' ? (
        showArchived ? (
          <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
            {['REJECTED', 'DORMANT'].map((stage) => {
              const stageJobs = archivedJobs.filter((job) => job.stage === stage);
              if (stageJobs.length === 0) {
                return null;
              }
              return (
                <div key={stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">{stage === 'REJECTED' ? 'Rejected' : 'Dormant'}</h3>
                    <span className="text-xs text-slate-400">{stageJobs.length}</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {stageJobs.map((job) => renderJobCard(job))}
                  </div>
                </div>
              );
            })}
            {archivedJobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-400">
                No archived jobs yet.
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((column) => {
              const stageJobs = visibleActiveJobs.filter((job) => job.stage === column.stage);
              return (
                <div key={column.stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">{column.title}</h3>
                    <span className="text-xs text-slate-400">{stageJobs.length}</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {stageJobs.map((job) => renderJobCard(job))}
                    {stageJobs.length === 0 && (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-400">
                        No items yet.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <JobListTable
          jobs={(showArchived ? archivedJobs : visibleActiveJobs).map((job) => ({
            id: job.id,
            company: job.company,
            role: job.role,
            stage: job.stage,
            heat: job.heat,
            updatedAt: job.updatedAt,
            lastTouchAt: job.lastTouchAt,
            nextFollowUpAt: job.nextFollowUpAt,
            sourceUrl: job.sourceUrl ?? null,
            archived: job.archived,
            contactsCount: job.contactsCount ?? 0,
            contacts: job.contacts ?? []
          }))}
          onEdit={handleEdit}
          onHistory={setHistoryJobId}
          onDelete={handleDelete}
          onAddOutreach={(job) => {
            setOutreachJob({
              id: job.id,
              company: job.company,
              role: job.role,
              stage: job.stage,
              heat: job.heat,
              updatedAt: job.updatedAt,
              archived: job.archived,
              lastTouchAt: job.lastTouchAt,
              nextFollowUpAt: job.nextFollowUpAt,
              sourceUrl: job.sourceUrl ?? undefined,
              contactsCount: job.contactsCount,
              contacts: job.contacts
            });
          }}
          onChangeStage={(job) => {
            setStageJob({
              id: job.id,
              company: job.company,
              role: job.role,
              stage: job.stage
            });
          }}
          onOpenContact={handleOpenContact}
        />
      )}

      <JobHistoryModal
        jobId={historyJobId}
        open={historyJobId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryJobId(null);
          }
        }}
        onOpenContact={handleOpenContact}
      />

      {outreachJob && (
        <AddOutreachDialog
          job={outreachJob}
          open={outreachJob !== null}
          onOpenChange={(open) => {
            if (!open) {
              setOutreachJob(null);
            }
          }}
          onLinked={(result) => {
            let targetContactId = result.contactId;
            if (!targetContactId && result.contactName && result.contacts) {
              const match = result.contacts.find((contact) => contact.name === result.contactName);
              if (match?.id) {
                targetContactId = match.id;
              }
            }
            if (!targetContactId && result.contacts?.length) {
              targetContactId = result.contacts[result.contacts.length - 1]?.id;
            }
            if (targetContactId) {
              handleOpenContact(targetContactId);
            }
          }}
        />
      )}

      <Dialog.Root
        open={actionsJob !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionsJob(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Job actions</Dialog.Title>
            {actionsJob && (
              <>
                <Dialog.Description className="mt-1 text-sm text-slate-500">
                  {actionsJob.company} — {actionsJob.role}
                </Dialog.Description>
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  {buildActionSummary(actionsJob)}
                </p>
                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-600"
                    onClick={() => {
                      setHistoryJobId(actionsJob.id);
                      setActionsJob(null);
                    }}
                  >
                    👁 View history
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-100"
                    onClick={() => {
                      setOutreachJob({
                        ...actionsJob,
                        sourceUrl: actionsJob.sourceUrl ?? undefined
                      });
                      setActionsJob(null);
                    }}
                  >
                    ✉️ Add outreach
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-100"
                    onClick={() => {
                      handleEdit(actionsJob.id);
                      setActionsJob(null);
                    }}
                  >
                    ✏️ Edit details
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100"
                    onClick={() => {
                      handleDelete(actionsJob);
                      setActionsJob(null);
                    }}
                  >
                    🗑 Delete / archive
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                  onClick={() => setActionsJob(null)}
                >
                  Close
                </button>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {stageJob && (
        <UpdateJobStageDialog
          jobId={stageJob.id}
          currentStage={stageJob.stage}
          open={stageJob !== null}
          onOpenChange={(open) => {
            if (!open) {
              setStageJob(null);
            }
          }}
        />
      )}

      <Dialog.Root
        open={jobPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setJobPendingDelete(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/30" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-slate-900">Delete job</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500">
              {jobPendingDelete
                ? `Choose whether to archive or permanently delete ${jobPendingDelete.company} — ${jobPendingDelete.role}.`
                : 'Choose how to delete this job.'}
            </Dialog.Description>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-sm font-semibold text-slate-800">Soft delete (recommended)</h4>
                <p className="mt-1 text-xs text-slate-500">
                  Marks the job as dormant and hides it from the active pipeline. All history remains intact.
                </p>
                <button
                  type="button"
                  onClick={() => handleDeleteConfirm('soft')}
                  className="mt-3 w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                  disabled={deleteJob.isPending}
                >
                  {deleteJob.isPending ? 'Archiving…' : 'Archive job'}
                </button>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <h4 className="text-sm font-semibold text-red-700">Hard delete</h4>
                <p className="mt-1 text-xs text-red-600">
                  Removes the job and all related outreach, applications, history, and follow-ups. Use only if this is test data.
                </p>
                <button
                  type="button"
                  onClick={() => handleDeleteConfirm('hard')}
                  className="mt-3 w-full rounded-md border border-red-600 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-600 hover:text-white disabled:opacity-50"
                  disabled={deleteJob.isPending}
                >
                  {deleteJob.isPending ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Dialog.Close asChild>
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" disabled={deleteJob.isPending}>
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ContactDrawer
        contactId={focusContactId}
        mode="edit"
        open={contactDrawerOpen}
        onClose={() => {
          setContactDrawerOpen(false);
          setTimeout(() => setFocusContactId(null), 200);
        }}
      />
    </div>
  );
};
