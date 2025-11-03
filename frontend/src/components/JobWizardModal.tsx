import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useCreateJobMutation,
  useUpdateJobMutation,
  useJobDetailQuery,
  useContactSearchQuery,
  CreateJobMutationInput,
  parseApiError
} from '../api/hooks';
import { useEffect, useId, useState } from 'react';
import { useToast } from './ToastProvider';

const cuidChecker = z.string().cuid();
const outreachContextValues = ['JOB_OPPORTUNITY', 'CODE_REVIEW', 'CHECK_IN', 'REFERRAL_REQUEST', 'OTHER'] as const;
const outreachContextLabels: Record<(typeof outreachContextValues)[number], string> = {
  JOB_OPPORTUNITY: 'Job opportunity',
  CODE_REVIEW: 'Code review',
  CHECK_IN: 'Check in / hello',
  REFERRAL_REQUEST: 'Referral request',
  OTHER: 'Other'
};

const trimToUndefined = (value?: string | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const schema = z.object({
  company: z.string().min(1, 'Company required'),
  role: z.string().min(1, 'Role required'),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  tailoringScore: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => (val === undefined ? true : (val ?? 0) >= 0 && (val ?? 0) <= 100), 'Score must be 0-100'),
  outreachEnabled: z.boolean().default(false),
  contactLookup: z
    .string()
    .optional()
    .transform(trimToUndefined)
    .refine((val) => (val ?? '').length === 0 || val !== undefined, { message: 'Provide a contact' }),
  contactEmail: z
    .string()
    .optional()
    .transform(trimToUndefined)
    .refine((val) => !val || /\S+@\S+\.\S+/.test(val), 'Invalid email'),
  contactLinkedIn: z
    .string()
    .optional()
    .transform(trimToUndefined)
    .refine((val) => !val || /^https?:\/\//i.test(val), 'Invalid URL'),
  contactRole: z
    .string()
    .optional()
    .transform(trimToUndefined),
  messageType: z.string().optional(),
  personalizationScore: z
    .string()
    .transform((val) => (val ? Number(val) : undefined))
    .optional()
    .refine((val) => (val === undefined ? true : (val ?? 0) >= 0 && (val ?? 0) <= 100), '0-100 score'),
  channel: z.string().optional(),
  context: z.enum(outreachContextValues).default('JOB_OPPORTUNITY'),
  note: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

interface JobWizardModalProps {
  jobId?: string;  // If provided, opens in edit mode
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const JobWizardModal = ({ jobId, open: controlledOpen, onOpenChange }: JobWizardModalProps = {}) => {
  const createJob = useCreateJobMutation();
  const updateJob = useUpdateJobMutation();
  const [internalOpen, setInternalOpen] = useState(false);
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const formId = useId();
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const isEditMode = !!jobId;
  const { data: jobDetail } = useJobDetailQuery(jobId || '');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
    setError
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company: '',
      role: '',
      outreachEnabled: !isEditMode,  // Disable outreach in edit mode
      personalizationScore: '80',
      channel: 'EMAIL',
      context: 'JOB_OPPORTUNITY',
      contactLookup: '',
      contactEmail: undefined,
      contactLinkedIn: undefined,
      contactRole: undefined
    }
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && jobDetail) {
      reset({
        company: jobDetail.company,
        role: jobDetail.role,
        sourceUrl: jobDetail.sourceUrl || '',
        outreachEnabled: false,
      tailoringScore: undefined,
      personalizationScore: '80',
      channel: 'EMAIL',
      context: 'JOB_OPPORTUNITY',
      contactLookup: '',
      contactEmail: undefined,
      contactLinkedIn: undefined,
      contactRole: undefined
    });
      setFormError(null);
    }
  }, [isEditMode, jobDetail, reset]);

  const outreachEnabled = watch('outreachEnabled');

  useEffect(() => {
    if (!open) {
      setFormError(null);
    }
  }, [open]);

  const contactLookup = watch('contactLookup');
  const trimmedContactLookup = contactLookup?.trim() ?? '';
  const enableContactSearch =
    outreachEnabled &&
    trimmedContactLookup.length >= 2 &&
    !selectedContact &&
    !cuidChecker.safeParse(trimmedContactLookup).success;
  const { data: contactSuggestions = [], isFetching: isSearchingContacts } = useContactSearchQuery(
    trimmedContactLookup,
    { enabled: enableContactSearch, limit: 8 }
  );
  const isLikelyNewContact =
    outreachEnabled &&
    trimmedContactLookup.length > 0 &&
    !selectedContact &&
    !cuidChecker.safeParse(trimmedContactLookup).success;

  useEffect(() => {
    if (
      selectedContact &&
      trimmedContactLookup.length > 0 &&
      trimmedContactLookup !== selectedContact.name
    ) {
      setSelectedContact(null);
    }
  }, [selectedContact, trimmedContactLookup]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      if (isEditMode && jobId) {
        await updateJob.mutateAsync({
          id: jobId,
          company: values.company,
          role: values.role,
          sourceUrl: values.sourceUrl ? values.sourceUrl : null
        });
        toast.success('Job updated');
      } else {
        const payload: CreateJobMutationInput = {
          company: values.company,
          role: values.role,
          sourceUrl: values.sourceUrl ? values.sourceUrl : undefined,
          initialApplication:
            values.tailoringScore !== undefined
              ? {
                  tailoringScore: values.tailoringScore,
                  dateSent: new Date().toISOString()
                }
              : undefined,
          initialOutreach: values.outreachEnabled
            ? {
                contactId: undefined,
                contactCreate: undefined,
                channel: (values.channel ?? 'EMAIL').toUpperCase(),
                messageType: values.messageType && values.messageType.length > 0 ? values.messageType : 'intro_request',
                personalizationScore: values.personalizationScore ?? 70,
                content: values.note?.trim() ? values.note.trim() : undefined,
                context: values.context ?? 'JOB_OPPORTUNITY',
                createFollowUp: true,
                followUpNote: values.note?.trim() || undefined
              }
            : undefined
        };

        if (payload.initialOutreach) {
          const outreach = payload.initialOutreach;
          const trimmedContact = trimmedContactLookup;
          if (!trimmedContact) {
            setError('contactLookup', { type: 'manual', message: 'Provide a contact to log outreach' });
            setFormError('Provide a contact to log outreach before logging outreach.');
            return;
          }
          if (selectedContact) {
            outreach.contactId = selectedContact.id;
          } else if (cuidChecker.safeParse(trimmedContact).success) {
            outreach.contactId = trimmedContact;
          } else {
            outreach.contactCreate = {
              name: trimmedContact,
              role: values.contactRole,
              email: values.contactEmail,
              linkedinUrl: values.contactLinkedIn,
              companyName: values.company
            };
            outreach.contactId = undefined;
          }
        }

        await createJob.mutateAsync(payload);
      }

      reset({
        company: '',
        role: '',
        sourceUrl: '',
        tailoringScore: undefined,
        outreachEnabled: !isEditMode,
        context: 'JOB_OPPORTUNITY',
        contactLookup: '',
        contactEmail: undefined,
        contactLinkedIn: undefined,
        contactRole: undefined,
        channel: 'EMAIL',
        messageType: '',
        personalizationScore: '80',
        note: ''
      });
      setSelectedContact(null);
      setOpen(false);
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed.fieldErrors) {
        const fieldMap: Record<string, keyof FormValues> = {
          company: 'company',
          role: 'role',
          sourceUrl: 'sourceUrl',
          'initialApplication.tailoringScore': 'tailoringScore',
          'initialOutreach.channel': 'channel',
          'initialOutreach.messageType': 'messageType',
          'initialOutreach.personalizationScore': 'personalizationScore',
          'initialOutreach.contactId': 'contactLookup',
          'initialOutreach.content': 'note',
          'initialOutreach.contactCreate.name': 'contactLookup',
          'initialOutreach.contactCreate.email': 'contactEmail',
          'initialOutreach.contactCreate.linkedinUrl': 'contactLinkedIn',
          'initialOutreach.contactCreate.role': 'contactRole'
        };
        let handled = false;

        Object.entries(parsed.fieldErrors).forEach(([field, messages]) => {
          const mapped = fieldMap[field];
          if (mapped) {
            handled = true;
            setError(mapped, {
              type: 'server',
              message: messages.join(', ')
            });
          }
        });

        if (!handled) {
          setFormError(parsed.description ?? parsed.message);
        }
      }

      if (!parsed.fieldErrors) {
        setFormError(parsed.description ?? parsed.message);
      }
    }
  });

  const isPending = isEditMode ? updateJob.isPending : createJob.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {!isEditMode && (
        <Dialog.Trigger asChild>
          <button className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600">
            Add job & outreach
          </button>
        </Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 flex w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-hidden">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            {isEditMode ? 'Edit job' : 'New opportunity'}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            {isEditMode
              ? 'Update job details (company, role, URL)'
              : 'Capture the application with a tailored CV and queue the 3-day follow-up automatically.'}
          </Dialog.Description>
          <form className="mt-5 flex flex-1 flex-col" onSubmit={onSubmit}>
            {formError && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-company`}>
                    Company
                  </label>
                  <input
                    id={`${formId}-company`}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                    placeholder="Acme Corporation"
                    {...register('company')}
                  />
                  {errors.company && <p className="text-xs text-red-500">{errors.company.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-role`}>
                    Role
                  </label>
                  <input
                    id={`${formId}-role`}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                    placeholder="Senior Backend Engineer"
                    {...register('role')}
                  />
                  {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-sourceUrl`}>
                    Source URL
                  </label>
                  <input
                    id={`${formId}-sourceUrl`}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                    placeholder="https://"
                    {...register('sourceUrl')}
                  />
                </div>
                {!isEditMode && (
                  <>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1" htmlFor={`${formId}-tailoringScore`}>
                        Tailoring score (0-100)
                        <span className="text-[10px] uppercase text-slate-400" title="How well did you adapt your CV to this job (0-100)">
                          ⓘ
                        </span>
                      </label>
                      <input
                        type="number"
                        id={`${formId}-tailoringScore`}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                        {...register('tailoringScore')}
                      />
                    </div>
                    <div className="rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Log outreach now</p>
                          <p className="text-xs text-slate-500">Capture the touchpoint and auto-queue a follow-up.</p>
                        </div>
                        <label
                          htmlFor={`${formId}-outreachEnabled`}
                          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"
                        >
                          <span>Optional</span>
                          <input
                            id={`${formId}-outreachEnabled`}
                            type="checkbox"
                            className="h-4 w-4 accent-emerald-500"
                            {...register('outreachEnabled')}
                          />
                        </label>
                      </div>
                      {outreachEnabled && (
                        <div className="border-t border-slate-200 px-4 py-4 space-y-4 text-sm">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-contactLookup`}>
                                Contact
                              </label>
                              <div className="relative mt-1">
                                <input
                                  id={`${formId}-contactLookup`}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                                  placeholder="Start typing a name or paste a contact ID"
                                  {...register('contactLookup')}
                                />
                                {enableContactSearch && (
                                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                    {isSearchingContacts && (
                                      <p className="px-3 py-2 text-sm text-slate-500">Searching contacts…</p>
                                    )}
                                    {!isSearchingContacts && contactSuggestions.length === 0 && (
                                      <p className="px-3 py-2 text-sm text-slate-500">
                                        No existing contacts match. Continue typing to create a new one.
                                      </p>
                                    )}
                                    {!isSearchingContacts &&
                                      contactSuggestions.map((contact) => (
                                        <button
                                          key={contact.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedContact({ id: contact.id, name: contact.name });
                                            setValue('contactLookup', contact.name, { shouldDirty: true });
                                          }}
                                          className="flex w-full flex-col items-start gap-1 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                                        >
                                          <span className="font-medium text-slate-800">{contact.name}</span>
                                          <span className="text-xs text-slate-500">
                                            {[contact.role, contact.company?.name].filter(Boolean).join(' • ') || '—'}
                                          </span>
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </div>
                              {selectedContact && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                                    Selected: {selectedContact.name}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-blue-600 hover:underline"
                                    onClick={() => {
                                      setSelectedContact(null);
                                      setValue('contactLookup', '', { shouldDirty: true });
                                    }}
                                  >
                                    Clear
                                  </button>
                                </div>
                              )}
                              <p className="mt-1 text-[11px] text-slate-400">
                                Choose an existing contact or type a new name and add details below.
                              </p>
                              {errors.contactLookup && (
                                <p className="mt-1 text-xs text-red-500">{errors.contactLookup.message}</p>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-channel`}>
                                Channel
                              </label>
                              <select
                                id={`${formId}-channel`}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                                {...register('channel')}
                              >
                                <option value="EMAIL">Email</option>
                                <option value="LINKEDIN">LinkedIn</option>
                                <option value="PHONE">Phone</option>
                                <option value="OTHER">Other</option>
                              </select>
                            </div>
                          </div>
                          {isLikelyNewContact && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-3">
                              <p className="text-xs font-semibold text-slate-600">
                                A new contact <span className="text-slate-900">{contactLookup}</span> will be created for {watch('company')}.
                              </p>
                              <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <div className="md:col-span-1 col-span-3">
                                  <label className="text-[11px] font-semibold uppercase text-slate-500" htmlFor={`${formId}-contactEmail`}>
                                    Contact email (optional)
                                  </label>
                                  <input
                                    id={`${formId}-contactEmail`}
                                    type="email"
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                                    placeholder="email@example.com"
                                    {...register('contactEmail')}
                                  />
                                  {errors.contactEmail && (
                                    <p className="mt-1 text-[11px] text-red-500">{errors.contactEmail.message}</p>
                                  )}
                                </div>
                                <div className="md:col-span-1 col-span-3">
                                  <label className="text-[11px] font-semibold uppercase text-slate-500" htmlFor={`${formId}-contactRole`}>
                                    Role (optional)
                                  </label>
                                  <input
                                    id={`${formId}-contactRole`}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                                    placeholder="Hiring Manager, Recruiter…"
                                    {...register('contactRole')}
                                  />
                                </div>
                                <div className="md:col-span-1 col-span-3">
                                  <label className="text-[11px] font-semibold uppercase text-slate-500" htmlFor={`${formId}-contactLinkedIn`}>
                                    LinkedIn URL (optional)
                                  </label>
                                  <input
                                    id={`${formId}-contactLinkedIn`}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                                    placeholder="https://linkedin.com/in/username"
                                    {...register('contactLinkedIn')}
                                  />
                                  {errors.contactLinkedIn && (
                                    <p className="mt-1 text-[11px] text-red-500">{errors.contactLinkedIn.message}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-messageType`}>
                                Message type
                              </label>
                              <input
                                id={`${formId}-messageType`}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                                placeholder="intro_request"
                                {...register('messageType')}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-context`}>
                                Purpose
                              </label>
                              <select
                                id={`${formId}-context`}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 capitalize"
                                {...register('context')}
                              >
                                {outreachContextValues.map((value) => (
                                  <option key={value} value={value}>
                                    {outreachContextLabels[value]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1" htmlFor={`${formId}-personalization`}>
                                Personalization (0-100)
                                <span className="text-[10px] uppercase text-slate-400" title="How customized was your message to the person/company (0-100)">
                                  ⓘ
                                </span>
                              </label>
                              <input
                                type="number"
                                id={`${formId}-personalization`}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                                {...register('personalizationScore')}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-note`}>
                                Note
                              </label>
                              <textarea
                                id={`${formId}-note`}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                                placeholder="Paste what you sent or any next steps…"
                                rows={3}
                                {...register('note')}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Dialog.Close asChild>
                <button type="button" className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-wait disabled:opacity-75"
              >
                {isPending ? 'Saving…' : isEditMode ? 'Update job' : 'Create job'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
