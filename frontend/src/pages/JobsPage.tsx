import { formatDistanceToNow } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import { useJobsQuery, useDeleteJobMutation } from '../api/hooks';
import { HeatBadge } from '../components/HeatBadge';
import { JobWizardModal } from '../components/JobWizardModal';
import { JobHistoryModal } from '../components/JobHistoryModal';
import { LinkContactDialog } from '../components/LinkContactDialog';
import { JobListTable } from '../components/JobListTable';
import { UpdateJobStageDialog } from '../components/UpdateJobStageDialog';
import { ContactDrawer } from '../components/ContactDrawer';

const columns: Array<{ stage: string; title: string }> = [
  { stage: 'APPLIED', title: 'Applied' },
  { stage: 'HR', title: 'HR' },
  { stage: 'TECH', title: 'Tech' },
  { stage: 'OFFER', title: 'Offer' }
];

const archivedStages = ['REJECTED', 'DORMANT'];

export const JobsPage = () => {
  const [showArchived, setShowArchived] = useState(false);
  const { data: allJobs, isLoading } = useJobsQuery({ includeArchived: showArchived });
  const deleteJob = useDeleteJobMutation();
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [jobPendingDelete, setJobPendingDelete] = useState<{
    id: string;
    company: string;
    role: string;
  } | null>(null);
  const [historyJobId, setHistoryJobId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const [linkJob, setLinkJob] = useState<{
    id: string;
    company: string;
    role: string;
    stage: string;
    heat: number;
    lastTouchAt: string;
    nextFollowUpAt?: string | null;
    deadline?: string | null;
    sourceUrl?: string | null;
    contactsCount: number;
    contacts?: Array<{ id: string; name: string | null; role?: string | null }>;
  } | null>(null);
  const [stageJob, setStageJob] = useState<{
    id: string;
    company: string;
    role: string;
    stage: string;
  } | null>(null);
  const [focusContactId, setFocusContactId] = useState<string | null>(null);
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);

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

  const jobs = useMemo(
    () =>
      (allJobs ?? []).filter((job) =>
        showArchived ? archivedStages.includes(job.stage) : !archivedStages.includes(job.stage)
      ),
    [allJobs, showArchived]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Pipeline</h2>
          <p className="text-sm text-slate-500">Keep heat high by touching each role every 3 days.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <div key={column.stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{column.title}</h3>
                <span className="text-xs text-slate-400">
                  {jobs.filter((job) => job.stage === column.stage).length}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {jobs
                  .filter((job) => job.stage === column.stage)
                  .map((job) => (
                    <article key={job.id} className="group relative rounded-xl border border-white bg-white p-3 shadow-sm">
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
                      {job.contacts && job.contacts.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {job.contacts.map((contact) => (
                            <button
                              key={`${job.id}-${contact.id}`}
                              type="button"
                              onClick={() => handleOpenContact(contact.id)}
                              className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                            >
                              {contact.name ?? 'Unnamed contact'}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleEdit(job.id)}
                          className="rounded bg-blue-50 p-1 text-xs text-blue-600 hover:bg-blue-100"
                          title="Edit job"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setHistoryJobId(job.id)}
                          className="rounded bg-slate-100 p-1 text-xs text-slate-600 hover:bg-slate-200"
                          title="View history"
                        >
                          History
                        </button>
                        <button
                          onClick={() =>
                            setLinkJob({
                              id: job.id,
                              company: job.company,
                              role: job.role,
                              stage: job.stage,
                              heat: job.heat,
                              lastTouchAt: job.lastTouchAt,
                              nextFollowUpAt: job.nextFollowUpAt,
                              deadline: job.deadline,
                              sourceUrl: job.sourceUrl ?? undefined,
                              contactsCount: job.contactsCount ?? 0,
                              contacts: job.contacts ?? []
                            })
                          }
                          className="rounded bg-emerald-50 p-1 text-xs text-emerald-600 hover:bg-emerald-100"
                          title="Link contact"
                        >
                          Link
                        </button>
                        <button
                          onClick={() => handleDelete(job)}
                          className="rounded bg-red-50 p-1 text-xs text-red-600 hover:bg-red-100"
                          title="Delete job"
                        >
                          Del
                        </button>
                      </div>
                    </article>
                  ))}
                {jobs.filter((job) => job.stage === column.stage).length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-400">
                    No items yet.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <JobListTable
          jobs={jobs.map((job) => ({
            id: job.id,
            company: job.company,
            role: job.role,
            stage: job.stage,
            heat: job.heat,
            lastTouchAt: job.lastTouchAt,
            nextFollowUpAt: job.nextFollowUpAt,
            deadline: job.deadline,
            sourceUrl: job.sourceUrl ?? null,
            contactsCount: job.contactsCount ?? 0,
            contacts: job.contacts ?? []
          }))}
          onEdit={handleEdit}
          onHistory={setHistoryJobId}
          onDelete={handleDelete}
          onLinkContact={(job) => {
            setLinkJob({
              id: job.id,
              company: job.company,
              role: job.role,
              stage: job.stage,
              heat: job.heat,
              lastTouchAt: job.lastTouchAt,
              nextFollowUpAt: job.nextFollowUpAt,
              deadline: job.deadline ?? undefined,
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

      {linkJob && (
        <LinkContactDialog
          job={linkJob}
          open={linkJob !== null}
          onOpenChange={(open) => {
            if (!open) {
              setLinkJob(null);
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
