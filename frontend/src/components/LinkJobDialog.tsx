import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCreateJobMutation,
  useCreateJobOutreachMutation,
  useJobSearchQuery,
  JobOutreachPayload,
  CreateJobMutationInput
} from '../api/hooks';

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

const trimToUndefined = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const outreachContextValues = ['JOB_OPPORTUNITY', 'CODE_REVIEW', 'CHECK_IN', 'REFERRAL_REQUEST', 'OTHER'] as const;
const outreachContextLabels: Record<(typeof outreachContextValues)[number], string> = {
  JOB_OPPORTUNITY: 'Job opportunity',
  CODE_REVIEW: 'Code review',
  CHECK_IN: 'Personal check-in',
  REFERRAL_REQUEST: 'Referral request',
  OTHER: 'Other'
};

const outreachOutcomeValues = ['NONE', 'NO_RESPONSE', 'POSITIVE', 'NEGATIVE'] as const;
const outreachOutcomeLabels: Record<(typeof outreachOutcomeValues)[number], string> = {
  NONE: 'Not set',
  NO_RESPONSE: 'No response yet',
  POSITIVE: 'Positive',
  NEGATIVE: 'Negative'
};

const newJobSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  role: z.string().min(1, 'Role is required'),
  sourceUrl: z
    .string()
    .optional()
    .transform(trimToUndefined)
    .refine((value) => !value || /^https?:\/\//i.test(value), 'Invalid URL'),
});

type NewJobFormValues = z.infer<typeof newJobSchema>;

const outreachSchema = z.object({
  channel: z.enum(['EMAIL', 'LINKEDIN', 'PHONE', 'OTHER']),
  messageType: z.string().min(1, 'Message type required'),
  context: z.enum(outreachContextValues).default('JOB_OPPORTUNITY'),
  outcome: z.enum(outreachOutcomeValues).default('NONE'),
  personalizationScore: z
    .union([z.string(), z.number()])
    .transform((value) => {
      if (typeof value === 'number') return value;
      const trimmed = value.trim();
      if (trimmed.length === 0) return undefined;
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? undefined : parsed;
    })
    .optional()
    .refine((value) => value === undefined || (value >= 0 && value <= 100), {
      message: 'Score must be between 0 and 100'
    }),
  content: z
    .string()
    .optional()
    .transform(trimToUndefined),
  createFollowUp: z.boolean().default(true),
  followUpNote: z
    .string()
    .optional()
    .transform(trimToUndefined)
});

type OutreachFormValues = z.infer<typeof outreachSchema>;

type SelectedJob =
  | { type: 'existing'; job: JobSearchResult }
  | { type: 'new'; draft: NewJobFormValues };

interface LinkJobDialogProps {
  contact: ContactSummaryForLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked?: (result: { jobId: string; outreachId: string }) => void;
  defaultTab?: 'existing' | 'new';
}

export const LinkJobDialog = ({ contact, open, onOpenChange, onLinked, defaultTab = 'existing' }: LinkJobDialogProps) => {
  const [tab, setTab] = useState<'existing' | 'new'>(defaultTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const createJob = useCreateJobMutation();
  const createOutreach = useCreateJobOutreachMutation();

  const { data: jobResults, isFetching: isSearching } = useJobSearchQuery(debouncedTerm, {
    enabled: tab === 'existing',
    limit: 15
  });

  const {
    register: registerJob,
    handleSubmit: handleSubmitJob,
    reset: resetNewJob,
    formState: { errors: jobErrors }
  } = useForm<NewJobFormValues>({
    resolver: zodResolver(newJobSchema),
    defaultValues: {
      company: contact.companyName ?? ''
    }
  });

  const {
    register: registerOutreach,
    handleSubmit: handleSubmitOutreach,
    reset: resetOutreachForm,
    watch: watchOutreach,
    formState: { errors: outreachErrors }
  } = useForm<OutreachFormValues>({
    resolver: zodResolver(outreachSchema),
    defaultValues: {
      channel: 'LINKEDIN',
      messageType: 'intro_request',
      context: 'JOB_OPPORTUNITY',
      outcome: 'NONE',
      personalizationScore: 70,
      createFollowUp: true
    }
  });

  const followUpEnabled = watchOutreach('createFollowUp');

  useEffect(() => {
    if (!open) {
      setTab(defaultTab);
      setSearchTerm('');
      setDebouncedTerm('');
      setSelectedJob(null);
      setSelectionError(null);
      resetNewJob({ company: contact.companyName ?? '', role: '', sourceUrl: '' });
      resetOutreachForm({
        channel: 'LINKEDIN',
        messageType: 'intro_request',
        context: 'JOB_OPPORTUNITY',
        outcome: 'NONE',
        personalizationScore: 70,
        createFollowUp: true
      });
    }
  }, [open, defaultTab, contact.companyName, resetNewJob, resetOutreachForm]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 250);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const selectedLabel = useMemo(() => {
    if (!selectedJob) return null;
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

  const onPrepareNewJob = handleSubmitJob((values) => {
    setSelectedJob({ type: 'new', draft: values });
    setSelectionError(null);
  });

  const onSubmitOutreach = handleSubmitOutreach(async (values) => {
    if (!selectedJob) {
      setSelectionError('Select or create a job before adding outreach.');
      return;
    }

    let jobId = '';
    if (selectedJob.type === 'existing') {
      jobId = selectedJob.job.id;
    } else {
      const payload: CreateJobMutationInput = {
        company: selectedJob.draft.company,
        role: selectedJob.draft.role,
        sourceUrl: selectedJob.draft.sourceUrl ? selectedJob.draft.sourceUrl : undefined
      };
      try {
        const createdJob = await createJob.mutateAsync(payload);
        jobId = createdJob.id;
      } catch {
        return;
      }
    }

    const payload: JobOutreachPayload = {
      jobId,
      contactId: contact.id,
      channel: values.channel,
      messageType: values.messageType,
      personalizationScore: values.personalizationScore ?? undefined,
      content: values.content,
      context: values.context,
      outcome: values.outcome,
      createFollowUp: values.createFollowUp,
      followUpNote: values.followUpNote
    };

    try {
      const result = await createOutreach.mutateAsync(payload);
      resetOutreachForm({
        channel: 'LINKEDIN',
        messageType: 'intro_request',
        context: 'JOB_OPPORTUNITY',
        outcome: 'NONE',
        personalizationScore: 70,
        createFollowUp: true
      });
      setSelectedJob(null);
      onOpenChange(false);
      onLinked?.({ jobId: result.job.id, outreachId: result.outreach.id });
    } catch {
      // handled by mutation toast
    }
  });

  const isSubmitting = createOutreach.isPending || createJob.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-900/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            Add outreach for {contact.name}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            Link this contact to a job and capture what happened.
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
              <div className="mt-3 max-h-44 overflow-y-auto rounded-md border border-slate-200">
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
                    {...registerJob('company')}
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
                    {...registerJob('role')}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {jobErrors.role && (
                    <p className="mt-1 text-xs text-red-600">{jobErrors.role.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Source URL
                  </label>
                  <input
                    {...registerJob('sourceUrl')}
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

          <form className="mt-4 space-y-4" onSubmit={onSubmitOutreach}>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Channel</label>
                <select
                  {...registerOutreach('channel')}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Message type</label>
                <select
                  {...registerOutreach('messageType')}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="intro_request">Intro request</option>
                  <option value="follow_up">Follow up</option>
                  <option value="check_fit">Check fit</option>
                  <option value="other">Other</option>
                </select>
                {outreachErrors.messageType && (
                  <p className="mt-1 text-xs text-red-600">{outreachErrors.messageType.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Purpose</label>
                <select
                  {...registerOutreach('context')}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {outreachContextValues.map((value) => (
                    <option key={value} value={value}>
                      {outreachContextLabels[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Outcome</label>
                <select
                  {...registerOutreach('outcome')}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {outreachOutcomeValues.map((value) => (
                    <option key={value} value={value}>
                      {outreachOutcomeLabels[value]}
                    </option>
                  ))}
                </select>
                {outreachErrors.outcome && (
                  <p className="mt-1 text-xs text-red-600">{outreachErrors.outcome.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  Personalization score
                  <span className="text-xs text-slate-400" title="How customized was your message to the person/company (0-100)">
                    ⓘ
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  {...registerOutreach('personalizationScore')}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                {outreachErrors.personalizationScore && (
                  <p className="mt-1 text-xs text-red-600">
                    {outreachErrors.personalizationScore.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Follow-up note (queued task)
                </label>
                <input
                  {...registerOutreach('followUpNote')}
                  disabled={!followUpEnabled}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
                  placeholder="Optional reminder for your follow-up"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Message notes</label>
              <textarea
                {...registerOutreach('content')}
                rows={4}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Optional notes about what you sent."
              />
              {outreachErrors.content && (
                <p className="mt-1 text-xs text-red-600">{outreachErrors.content.message}</p>
              )}
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                {...registerOutreach('createFollowUp')}
                className="h-4 w-4 rounded border-slate-300"
              />
              Schedule follow-up in 3 days
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving…' : 'Add outreach'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
