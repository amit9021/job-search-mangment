import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import {
  useContactDetailQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useUpdateOutreachMutation,
  parseApiError
} from '../api/hooks';
import { CompanySelect } from './CompanySelect';
import { TagsInput } from './TagsInput';
import { StrengthBadge } from './StrengthBadge';
import { LinkJobDialog } from './LinkJobDialog';
import { useToast } from './ToastProvider';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  role: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(/^[\d\s+()-]*$/, 'Invalid phone').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  location: z.string().max(200).optional(),
  tags: z.array(z.string()).max(10).optional(),
  notes: z.string().optional(),
  strength: z.enum(['WEAK', 'MEDIUM', 'STRONG']).optional()
});

const outreachContextOptions = ['JOB_OPPORTUNITY', 'CODE_REVIEW', 'CHECK_IN', 'REFERRAL_REQUEST', 'OTHER'] as const;
const outreachContextLabels: Record<(typeof outreachContextOptions)[number], string> = {
  JOB_OPPORTUNITY: 'Job opportunity',
  CODE_REVIEW: 'Code review',
  CHECK_IN: 'Personal check-in',
  REFERRAL_REQUEST: 'Referral request',
  OTHER: 'Other'
};

const isValidOutreachContext = (
  value: string
): value is (typeof outreachContextOptions)[number] =>
  outreachContextOptions.includes(value as (typeof outreachContextOptions)[number]);

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactDrawerProps {
  contactId: string | null;
  mode: 'edit' | 'create';
  open: boolean;
  onClose: () => void;
  onCreated?: (contact: { id: string; name: string }) => void;
}

export const ContactDrawer = ({ contactId, mode, open, onClose, onCreated }: ContactDrawerProps) => {
  const isCreateMode = mode === 'create';
  const { data: contact, isLoading } = useContactDetailQuery(contactId || '');
  const updateContact = useUpdateContactMutation();
  const createContact = useCreateContactMutation();
  const deleteContact = useDeleteContactMutation();
  const updateOutreach = useUpdateOutreachMutation();
  const toast = useToast();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingContext, setEditingContext] = useState<{
    id: string;
    value: (typeof outreachContextOptions)[number];
  } | null>(null);

  const startEditingContext = (outreachId: string, currentValue: string) => {
    setEditingContext({
      id: outreachId,
      value: isValidOutreachContext(currentValue) ? currentValue : 'OTHER'
    });
  };

  const handleContextSave = async () => {
    if (!editingContext) {
      return;
    }
    try {
      await updateOutreach.mutateAsync({
        id: editingContext.id,
        context: editingContext.value
      });
      setEditingContext(null);
    } catch {
      // handled by toast
    }
  };

  const handleDelete = async (mode: 'soft' | 'hard') => {
    if (!contactId) {
      return;
    }
    try {
      await deleteContact.mutateAsync({ id: contactId, hard: mode === 'hard' });
      setConfirmingDelete(false);
      onClose();
    } catch {
      // handled via toast
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isDirty }
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      companyId: undefined,
      companyName: '',
      role: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      githubUrl: '',
      location: '',
      tags: [],
      notes: '',
      strength: 'WEAK'
    }
  });

  const tags = watch('tags') || [];
  const companyValue = watch('companyName') || '';

  // Populate form when contact data loads in edit mode
  useEffect(() => {
    if (!isCreateMode && contact) {
      reset({
        name: contact.name,
        companyId: contact.company?.id,
        companyName: contact.company?.name || '',
        role: contact.role || '',
        email: contact.email || '',
        phone: contact.phone || '',
        linkedinUrl: contact.linkedinUrl || '',
        githubUrl: contact.githubUrl || '',
        location: contact.location || '',
        tags: contact.tags || [],
        notes: contact.notes || '',
        strength: contact.strength as 'WEAK' | 'MEDIUM' | 'STRONG'
      });
      setFormError(null);
    }
  }, [contact, isCreateMode, reset]);

  // Reset defaults when entering create mode
  useEffect(() => {
    if (isCreateMode && open) {
      reset({
        name: '',
        companyId: undefined,
        companyName: '',
        role: '',
        email: '',
        phone: '',
        linkedinUrl: '',
        githubUrl: '',
        location: '',
        tags: [],
        notes: '',
        strength: 'WEAK'
      });
      setFormError(null);
    }
  }, [isCreateMode, open, reset]);

  useEffect(() => {
    if (!open) {
      setLinkDialogOpen(false);
      setFormError(null);
      setConfirmingDelete(false);
      setEditingContext(null);
    }
  }, [open]);

  useEffect(() => {
    setLinkDialogOpen(false);
    setEditingContext(null);
  }, [contactId]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      if (isCreateMode) {
        const payload = {
          ...values,
          companyId: values.companyId || undefined,
          companyName: values.companyName || undefined,
          tags: values.tags ?? [],
          strength: values.strength ?? 'WEAK'
        };
        const created = (await createContact.mutateAsync(payload)) as { id: string; name?: string };
        const createdName = created?.name ?? values.name;
        toast.success('Contact created', `${createdName} added to Contacts`);
        setLinkDialogOpen(false);
        onCreated?.({ id: created.id, name: createdName });
        return;
      }

      if (!contactId) {
        return;
      }

      await updateContact.mutateAsync({
        id: contactId,
        ...values,
        companyId: values.companyId ?? null,
        companyName: values.companyName
      });

      toast.success('Contact updated');
      setLinkDialogOpen(false);
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      let handled = false;

      if (parsed.fieldErrors) {
        const fieldMap: Record<string, keyof ContactFormValues> = {
          name: 'name',
          companyId: 'companyName',
          companyName: 'companyName',
          role: 'role',
          email: 'email',
          phone: 'phone',
          linkedinUrl: 'linkedinUrl',
          githubUrl: 'githubUrl',
          location: 'location',
          notes: 'notes',
          strength: 'strength',
          tags: 'tags'
        };

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
      }

      const fallbackMessage = parsed.description ?? parsed.message ?? 'Unable to save contact';
      if (!handled) {
        setFormError(fallbackMessage);
      }
      toast.error(parsed.message ?? 'Error', parsed.description);
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'outreach':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'referral':
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'review':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
        );
      case 'followup':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l2.5 2.5M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const timelineItems = contact?.timeline ?? [];
  const linkedJobs = contact?.linkedJobs ?? [];
  const isSubmitting = isCreateMode ? createContact.isPending : updateContact.isPending;
  const submitLabel = isCreateMode ? 'Create contact' : 'Save changes';
  const submittingLabel = isCreateMode ? 'Creating…' : 'Saving…';
  const showLoading = !isCreateMode && (isLoading || !contact);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 overflow-y-auto">
            {showLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading…</div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {isCreateMode ? (
                        <>
                          <Dialog.Title className="text-2xl font-bold text-gray-900">
                            New contact
                          </Dialog.Title>
                          <p className="mt-2 text-sm text-gray-600">
                            Capture their details now so you can link outreach and referrals later.
                          </p>
                        </>
                      ) : (
                        <>
                          <Dialog.Title className="text-2xl font-bold text-gray-900">
                            {contact?.name}
                          </Dialog.Title>
                          {contact?.role && <div className="mt-1 text-gray-600">{contact.role}</div>}
                          {contact?.company && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                                {contact.company.name}
                              </span>
                            </div>
                          )}
                          <div className="mt-2">
                            {contact && <StrengthBadge strength={contact.strength} />}
                          </div>
                          {linkedJobs.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[11px] font-semibold uppercase text-gray-400">
                                Linked roles
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {linkedJobs.map((job) => (
                                  <span
                                    key={job.id}
                                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700"
                                  >
                                    <span className="font-medium text-blue-800">
                                      {job.company}
                                      {job.role ? ` — ${job.role}` : ''}
                                    </span>
                                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] uppercase text-blue-600">
                                      {job.stage.toLowerCase()}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setLinkDialogOpen(true)}
                              className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Link to job
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <Dialog.Close className="text-gray-400 hover:text-gray-600">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Dialog.Close>
                  </div>
                </div>

                <Tabs.Root defaultValue="details" className="flex-1 flex flex-col">
                  <Tabs.List className="flex border-b border-gray-200 px-6">
                    <Tabs.Trigger
                      value="details"
                      className="px-4 py-3 text-sm font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600"
                    >
                      Details
                    </Tabs.Trigger>
                    {!isCreateMode && (
                      <Tabs.Trigger
                        value="timeline"
                        className="px-4 py-3 text-sm font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600"
                      >
                        Timeline ({timelineItems.length})
                      </Tabs.Trigger>
                    )}
                  </Tabs.List>

                  <Tabs.Content value="details" className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={onSubmit} className="space-y-6">
                      <input type="hidden" {...register('companyId')} />
                      <input type="hidden" {...register('companyName')} />
                      {formError && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                          {formError}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          {...register('name')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <CompanySelect
                          value={companyValue}
                          onChange={({ companyId, companyName }) => {
                            setValue('companyId', companyId, { shouldDirty: true });
                            setValue('companyName', companyName ?? '', { shouldDirty: true });
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <input
                          {...register('role')}
                          placeholder="e.g. Senior Engineer, Hiring Manager"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          {...register('email')}
                          type="email"
                          placeholder="email@example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          {...register('phone')}
                          type="tel"
                          placeholder="+1-555-0123"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                        <input
                          {...register('linkedinUrl')}
                          type="url"
                          placeholder="https://linkedin.com/in/username"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.linkedinUrl && <p className="mt-1 text-sm text-red-600">{errors.linkedinUrl.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                        <input
                          {...register('githubUrl')}
                          type="url"
                          placeholder="https://github.com/username"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.githubUrl && <p className="mt-1 text-sm text-red-600">{errors.githubUrl.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                          {...register('location')}
                          placeholder="e.g. San Francisco, CA"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                        <TagsInput
                          value={tags}
                          onChange={(newTags) => setValue('tags', newTags, { shouldDirty: true })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Strength</label>
                        <div className="flex gap-4">
                          {(['WEAK', 'MEDIUM', 'STRONG'] as const).map((strength) => (
                            <label key={strength} className="flex items-center">
                              <input
                                {...register('strength')}
                                type="radio"
                                value={strength}
                                className="mr-2"
                              />
                              <StrengthBadge strength={strength} />
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          {...register('notes')}
                          rows={4}
                          placeholder="Add notes about this contact..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex gap-3 pt-4 border-t">
                        <button
                          type="submit"
                          disabled={!isDirty || isSubmitting}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? submittingLabel : submitLabel}
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                    {!isCreateMode && contactId && (
                      <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                        <h4 className="text-sm font-semibold text-red-700">Danger zone</h4>
                        <p className="mt-1 text-xs text-red-600">
                          Archiving keeps history but hides the contact. Permanently deleting removes all related
                          outreach, follow-ups, and referrals.
                        </p>
                        {confirmingDelete ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete('soft')}
                              disabled={deleteContact.isPending}
                              className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {deleteContact.isPending ? 'Archiving…' : 'Archive contact'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete('hard')}
                              disabled={deleteContact.isPending}
                              className="rounded border border-red-600 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                              {deleteContact.isPending ? 'Deleting…' : 'Delete permanently'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDelete(false)}
                              disabled={deleteContact.isPending}
                              className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => setConfirmingDelete(true)}
                              className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                            >
                              Delete contact
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Tabs.Content>

                  {!isCreateMode && (
                    <Tabs.Content value="timeline" className="flex-1 overflow-y-auto p-6">
                      {timelineItems.length > 0 ? (
                        <div className="space-y-6">
                          {timelineItems.map((item, index) => (
                            <div key={index} className="flex gap-4">
                              {getTimelineIcon(item.type)}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-gray-900 capitalize">{item.type}</div>
                                  <div className="text-sm text-gray-500">{formatDate(item.date)}</div>
                                </div>
                                <div className="mt-1 space-y-2 text-sm text-gray-600">
                                  {item.type === 'outreach' && (
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        <span>Channel: {item.data.channel}</span>
                                        <span>Message: {item.data.messageType}</span>
                                        <span>Personalization: {item.data.personalizationScore}</span>
                                        <span>Outcome: {item.data.outcome || 'Pending'}</span>
                                      </div>
                                      {item.data.job && (
                                        <div className="text-xs text-slate-500">
                                          Regarding: {item.data.job.company}
                                          {item.data.job.role ? ` — ${item.data.job.role}` : ''}
                                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-slate-600">
                                            {item.data.job.stage.toLowerCase()}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                        <span className="font-medium text-slate-600">
                                          Purpose: {outreachContextLabels[
                                            (item.data.context as (typeof outreachContextOptions)[number])
                                          ] ?? item.data.context}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => startEditingContext(item.data.id, item.data.context)}
                                          className="rounded border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600"
                                        >
                                          Edit purpose
                                        </button>
                                      </div>
                                      {editingContext?.id === item.data.id && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                          <select
                                            value={editingContext.value}
                                            onChange={(event) => {
                                              const value = event.target.value;
                                              if (isValidOutreachContext(value)) {
                                                setEditingContext({ id: editingContext.id, value });
                                              }
                                            }}
                                            className="rounded border border-slate-300 px-2 py-1 text-xs capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                          >
                                            {outreachContextOptions.map((option) => (
                                              <option key={option} value={option}>
                                                {outreachContextLabels[option]}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            type="button"
                                            onClick={handleContextSave}
                                            disabled={updateOutreach.isPending}
                                            className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 disabled:opacity-60"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingContext(null)}
                                            disabled={updateOutreach.isPending}
                                            className="rounded border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-100"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      )}
                                      {item.data.content && <div className="text-xs text-slate-500">Note: {item.data.content}</div>}
                                    </div>
                                  )}
                                  {item.type === 'referral' && (
                                    <div className="space-y-1">
                                      <div>Kind: {item.data.kind}</div>
                                      {item.data.job && <div>For: {item.data.job.company} - {item.data.job.role}</div>}
                                    </div>
                                  )}
                                  {item.type === 'review' && (
                                    <div className="space-y-1">
                                      <div>Project: {item.data.project?.name}</div>
                                      {item.data.qualityScore && <div>Score: {item.data.qualityScore}/100</div>}
                                    </div>
                                  )}
                                  {item.type === 'followup' && (
                                    <div className="space-y-1">
                                      <div>Attempt #{item.data.attemptNo}</div>
                                      <div>
                                        Status:{' '}
                                        {item.data.sentAt
                                          ? `Completed ${formatDate(item.data.sentAt as string)}`
                                          : 'Open'}
                                      </div>
                                      {item.data.job && (
                                        <div className="text-xs text-slate-500">
                                          Job: {item.data.job.company}
                                          {item.data.job.role ? ` — ${item.data.job.role}` : ''}
                                        </div>
                                      )}
                                      {item.data.note && <div className="text-xs text-slate-500">Note: {item.data.note}</div>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="text-gray-400 text-lg mb-2">No activity yet</div>
                          <div className="text-sm text-gray-500">Outreach, follow-ups, referrals, and reviews will appear here</div>
                        </div>
                      )}
                    </Tabs.Content>
                  )}
                </Tabs.Root>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {!isCreateMode && contact && contactId && (
        <LinkJobDialog
          contact={{ id: contact.id, name: contact.name, companyName: contact.company?.name }}
          open={linkDialogOpen}
          onOpenChange={(open) => setLinkDialogOpen(open)}
        />
      )}
    </>
  );
};
