import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateJobMutation, useJobSearchQuery } from '../api/hooks';

type ContactSummaryForLink = {
  id: string;
  name: string;
  companyName?: string;
};

type JobSearchResult = {
  id: string;
  company: string;
  role: string;
  stage: string;
  contactsCount: number;
};

type LinkedJobSummary = {
  id: string;
  company: string;
  role: string | null;
  stage?: string;
};

const trimToUndefined = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const newJobSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  role: z.string().min(1, 'Role is required'),
  sourceUrl: z
    .string()
    .optional()
    .transform(trimToUndefined)
    .refine((value) => !value || /^https?:\/\//i.test(value), 'Invalid URL')
});

type NewJobFormValues = z.infer<typeof newJobSchema>;

type SelectedJob =
  | { type: 'existing'; job: JobSearchResult }
  | { type: 'new'; draft: NewJobFormValues };

interface LinkJobDialogProps {
  contact: ContactSummaryForLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked?: (job: LinkedJobSummary) => void;
  defaultTab?: 'existing' | 'new';
}

export const LinkJobDialog = ({
  contact,
  open,
  onOpenChange,
  onLinked,
  defaultTab = 'existing'
}: LinkJobDialogProps) => {
  const [tab, setTab] = useState<'existing' | 'new'>(defaultTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const createJob = useCreateJobMutation();

  const { data: jobResults, isFetching: isSearching } = useJobSearchQuery(debouncedTerm, {
    enabled: tab === 'existing',
    limit: 15
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: jobErrors }
  } = useForm<NewJobFormValues>({
    resolver: zodResolver(newJobSchema),
    defaultValues: {
      company: contact.companyName ?? '',
      role: '',
      sourceUrl: ''
    }
  });

  useEffect(() => {
    if (!open) {
      setSelectedJob(null);
      setSelectionError(null);
      setSearchTerm('');
      setDebouncedTerm('');
      setTab(defaultTab);
      reset({
        company: contact.companyName ?? '',
        role: '',
        sourceUrl: ''
      });
    }
  }, [open, defaultTab, contact.companyName, reset]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 250);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const selectedLabel = useMemo(() => {
    if (!selectedJob) {
      return null;
    }
    if (selectedJob.type === 'existing') {
      const job = selectedJob.job;
      return `${job.company} — ${job.role}`;
    }
    return `${selectedJob.draft.company} — ${selectedJob.draft.role}`;
  }, [selectedJob]);

  const onUseExistingJob = (job: JobSearchResult) => {
    setSelectedJob({ type: 'existing', job });
    setSelectionError(null);
  };

  const onPrepareNewJob = handleSubmit((values) => {
    setSelectedJob({ type: 'new', draft: values });
    setSelectionError(null);
  });

  const handleConfirm = async () => {
    if (!selectedJob) {
      setSelectionError('Select or create a job to continue.');
      return;
    }

    if (selectedJob.type === 'existing') {
      const job = selectedJob.job;
      onLinked?.({
        id: job.id,
        company: job.company,
        role: job.role,
        stage: job.stage
      });
      onOpenChange(false);
      return;
    }

    try {
      const createdJob = await createJob.mutateAsync({
        company: selectedJob.draft.company,
        role: selectedJob.draft.role,
        sourceUrl: selectedJob.draft.sourceUrl
      });
      onLinked?.({
        id: createdJob.id,
        company: createdJob.company,
        role: createdJob.role,
        stage: createdJob.stage
      });
      onOpenChange(false);
    } catch {
      // handled via mutation toast
    }
  };

  const isCreatingJob = createJob.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-900/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            Link {contact.name} to a job
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            Pick an existing role or spin up a new one without leaving the drawer.
          </Dialog.Description>

          <Tabs.Root value={tab} onValueChange={(value) => setTab(value as 'existing' | 'new')}>
            <Tabs.List className="mt-4 flex gap-2 border-b border-slate-200 pb-2">
              <Tabs.Trigger
                value="existing"
                className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                Select job
              </Tabs.Trigger>
              <Tabs.Trigger
                value="new"
                className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                Create job
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="existing" className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Search jobs</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by company or role…"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-slate-200">
                {debouncedTerm.length < 2 && (
                  <p className="p-3 text-sm text-slate-500">
                    Enter at least two characters to search jobs.
                  </p>
                )}
                {debouncedTerm.length >= 2 && isSearching && (
                  <p className="p-3 text-sm text-slate-500">Searching…</p>
                )}
                {debouncedTerm.length >= 2 && !isSearching && (jobResults ?? []).length === 0 && (
                  <p className="p-3 text-sm text-slate-500">No jobs found for that query.</p>
                )}
                {debouncedTerm.length >= 2 &&
                  (jobResults ?? []).map((job) => {
                    const isSelected =
                      selectedJob?.type === 'existing' && selectedJob.job.id === job.id;
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => onUseExistingJob(job)}
                        className={`flex w-full flex-col items-start gap-1 border-b border-slate-100 px-3 py-2 text-left text-sm transition ${
                          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-medium">{job.company}</span>
                        <span className="text-xs text-slate-500">{job.role}</span>
                        <span className="text-xs text-slate-400">
                          Stage {job.stage.toLowerCase()} · {job.contactsCount} contact(s)
                        </span>
                      </button>
                    );
                  })}
              </div>
            </Tabs.Content>

            <Tabs.Content value="new" className="mt-4">
              <form className="space-y-3" onSubmit={onPrepareNewJob}>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('company')}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {jobErrors.company && (
                    <p className="mt-1 text-xs text-red-600">{jobErrors.company.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('role')}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {jobErrors.role && (
                    <p className="mt-1 text-xs text-red-600">{jobErrors.role.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Source URL</label>
                  <input
                    {...register('sourceUrl')}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="https://company.com/job-posting"
                  />
                  {jobErrors.sourceUrl && (
                    <p className="mt-1 text-xs text-red-600">{jobErrors.sourceUrl.message}</p>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Use this job
                  </button>
                </div>
              </form>
            </Tabs.Content>
          </Tabs.Root>

          <div className="mt-5 space-y-3">
            {selectedLabel ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                Job: <span className="font-medium">{selectedLabel}</span>
                <button
                  type="button"
                  className="ml-3 text-xs font-semibold underline"
                  onClick={() => setSelectedJob(null)}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                Select or create a job to continue.
              </div>
            )}
            {selectionError && <p className="text-xs text-red-600">{selectionError}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                disabled={isCreatingJob}
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!selectedJob || isCreatingJob}
            >
              {isCreatingJob ? 'Linking…' : 'Continue'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
