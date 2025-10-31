import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useContactSearchQuery,
  useCreateJobOutreachMutation,
  JobOutreachPayload
} from '../api/hooks';

type JobSummaryForLink = {
  id: string;
  company: string;
  role: string;
};

type ContactResult = {
  id: string;
  name: string;
  role?: string;
  email?: string;
  linkedinUrl?: string;
  company?: { id: string; name: string };
};

const trimToUndefined = (value?: string | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
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

const newContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z
    .string()
    .optional()
    .transform(trimToUndefined),
  email: z
    .string()
    .optional()
    .transform(trimToUndefined)
    .refine((value) => !value || /\S+@\S+\.\S+/.test(value), 'Invalid email'),
  linkedinUrl: z
    .string()
    .optional()
    .transform(trimToUndefined)
    .refine((value) => !value || /^https?:\/\//i.test(value), 'Invalid URL'),
  companyName: z
    .string()
    .optional()
    .transform(trimToUndefined)
});

type NewContactFormValues = z.infer<typeof newContactSchema>;

const outreachSchema = z.object({
  channel: z.enum(['EMAIL', 'LINKEDIN', 'PHONE', 'OTHER']),
  messageType: z.string().min(1, 'Message type required'),
  context: z.enum(outreachContextValues).default('JOB_OPPORTUNITY'),
  personalizationScore: z
    .union([z.string(), z.number()])
    .transform((value) => {
      if (typeof value === 'number') {
        return value;
      }
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return undefined;
      }
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

type SelectedContact =
  | { type: 'existing'; contact: ContactResult }
  | { type: 'new'; draft: NewContactFormValues };

interface LinkContactDialogProps {
  job: JobSummaryForLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked?: (result: {
    jobId: string;
    contactId?: string;
    contactName?: string | null;
    contacts?: Array<{ id: string; name: string | null; role?: string | null }>;
  }) => void;
}

export const LinkContactDialog = ({ job, open, onOpenChange, onLinked }: LinkContactDialogProps) => {
  const [tab, setTab] = useState<'existing' | 'new'>('existing');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selected, setSelected] = useState<SelectedContact | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const createOutreach = useCreateJobOutreachMutation();

  const { data: contactResults, isFetching: isSearching } = useContactSearchQuery(debouncedTerm, {
    enabled: tab === 'existing',
    limit: 15
  });

  const {
    register: registerContact,
    handleSubmit: handleSubmitContact,
    reset: resetNewContact,
    formState: { errors: contactErrors }
  } = useForm<NewContactFormValues>({
    resolver: zodResolver(newContactSchema),
    defaultValues: {
      companyName: job.company
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
      channel: 'EMAIL',
      messageType: 'intro_request',
      context: 'JOB_OPPORTUNITY',
      personalizationScore: 70,
      createFollowUp: true
    }
  });

  const createFollowUpEnabled = watchOutreach('createFollowUp');

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setDebouncedTerm('');
      setSelected(null);
      setTab('existing');
      resetNewContact({ companyName: job.company });
      resetOutreachForm({
        channel: 'EMAIL',
        messageType: 'intro_request',
        context: 'JOB_OPPORTUNITY',
        personalizationScore: 70,
        createFollowUp: true
      });
      setContactError(null);
    }
  }, [open, job.company, resetNewContact, resetOutreachForm]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const selectedLabel = useMemo(() => {
    if (!selected) return null;
    if (selected.type === 'existing') {
      const { contact } = selected;
      const company = contact.company?.name ? ` · ${contact.company.name}` : '';
      return `${contact.name}${company}`;
    }
    const name = selected.draft.name;
    const company = selected.draft.companyName ? ` · ${selected.draft.companyName}` : '';
    return `${name}${company}`;
  }, [selected]);

  const handleExistingSelect = (contact: ContactResult) => {
    setSelected({ type: 'existing', contact });
    setContactError(null);
  };

  const onCreateNewContact = handleSubmitContact((values) => {
    setSelected({ type: 'new', draft: values });
    setContactError(null);
  });

  const onSubmitOutreach = handleSubmitOutreach(async (values) => {
    if (!selected) {
      setContactError('Select or create a contact before logging outreach.');
      return;
    }

    const payload: JobOutreachPayload = {
      jobId: job.id,
      channel: values.channel,
      messageType: values.messageType,
      personalizationScore: values.personalizationScore ?? undefined,
      content: values.content,
      context: values.context,
      createFollowUp: values.createFollowUp,
      followUpNote: values.followUpNote
    };

    if (selected.type === 'existing') {
      payload.contactId = selected.contact.id;
    } else {
      payload.contactCreate = {
        ...selected.draft,
        companyName: selected.draft.companyName ?? job.company
      };
    }

    try {
      const result = await createOutreach.mutateAsync(payload);
      resetOutreachForm({
        channel: 'EMAIL',
        messageType: 'intro_request',
        context: 'JOB_OPPORTUNITY',
        personalizationScore: 70,
        createFollowUp: true
      });
      setSelected(null);
      onOpenChange(false);
      const contactId = result.outreach.contactId ?? result.outreach.contact?.id ?? undefined;
      const contactName = result.outreach.contact?.name ?? result.outreach.contactId ?? null;
      onLinked?.({
        jobId: job.id,
        contactId,
        contactName,
        contacts: result.job?.contacts ?? []
      });
    } catch {
      // errors handled by mutation toast
    }
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            Link contact to {job.company}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            Create an outreach record that connects this job to a person.
          </Dialog.Description>

          <div className="mt-4">
            <Tabs.Root value={tab} onValueChange={(value) => setTab(value as 'existing' | 'new')}>
              <Tabs.List className="flex gap-2 border-b border-slate-200 pb-2">
                <Tabs.Trigger
                  value="existing"
                  className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  Select existing
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="new"
                  className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  Create new
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="existing" className="mt-4">
                <label className="block text-sm font-medium text-slate-700">Search contacts</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Type name, company, email, or LinkedIn…"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <div className="mt-3 max-h-44 overflow-y-auto rounded-md border border-slate-200">
                  {debouncedTerm.length < 2 && (
                    <p className="p-3 text-sm text-slate-500">
                      Enter at least two characters to search your contacts.
                    </p>
                  )}
                  {debouncedTerm.length >= 2 && isSearching && (
                    <p className="p-3 text-sm text-slate-500">Searching…</p>
                  )}
                  {debouncedTerm.length >= 2 && !isSearching && (contactResults ?? []).length === 0 && (
                    <p className="p-3 text-sm text-slate-500">No matches found. Try a different query.</p>
                  )}
                  {debouncedTerm.length >= 2 &&
                    (contactResults ?? []).map((contact) => {
                      const isSelected =
                        selected?.type === 'existing' && selected.contact.id === contact.id;
                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => handleExistingSelect(contact)}
                          className={`flex w-full flex-col items-start gap-1 border-b border-slate-100 px-3 py-2 text-left text-sm transition ${
                            isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-medium">{contact.name}</span>
                          <span className="text-xs text-slate-500">
                            {[contact.role, contact.company?.name].filter(Boolean).join(' • ') || '—'}
                          </span>
                          {contact.email && (
                            <span className="text-xs text-slate-400">{contact.email}</span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </Tabs.Content>

              <Tabs.Content value="new" className="mt-4">
                <form className="space-y-3" onSubmit={onCreateNewContact}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...registerContact('name')}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {contactErrors.name && (
                      <p className="mt-1 text-xs text-red-600">{contactErrors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Role</label>
                    <input
                      {...registerContact('role')}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {contactErrors.role && (
                      <p className="mt-1 text-xs text-red-600">{contactErrors.role.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input
                      {...registerContact('email')}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {contactErrors.email && (
                      <p className="mt-1 text-xs text-red-600">{contactErrors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">LinkedIn URL</label>
                    <input
                      {...registerContact('linkedinUrl')}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {contactErrors.linkedinUrl && (
                      <p className="mt-1 text-xs text-red-600">{contactErrors.linkedinUrl.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Company</label>
                    <input
                      {...registerContact('companyName')}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {contactErrors.companyName && (
                      <p className="mt-1 text-xs text-red-600">{contactErrors.companyName.message}</p>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Use this contact
                    </button>
                  </div>
                </form>
              </Tabs.Content>
            </Tabs.Root>
          </div>

          <div className="mt-5 space-y-3">
            {selectedLabel ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                Linking to: <span className="font-medium">{selectedLabel}</span>
                <button
                  type="button"
                  className="ml-3 text-xs font-semibold underline"
                  onClick={() => setSelected(null)}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                Select or create a contact to continue.
              </div>
            )}
            {contactError && <p className="text-xs text-red-600">{contactError}</p>}
          </div>

        <form className="mt-4 space-y-4" onSubmit={onSubmitOutreach}>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Channel</label>
                <select
                  {...registerOutreach('channel')}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="EMAIL">Email</option>
                  <option value="LINKEDIN">LinkedIn</option>
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
                  disabled={!createFollowUpEnabled}
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
                  disabled={createOutreach.isPending}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={createOutreach.isPending}
              >
                {createOutreach.isPending ? 'Linking…' : 'Link contact'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
