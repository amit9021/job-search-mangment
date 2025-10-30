import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateJobMutation, useUpdateJobMutation, useJobDetailQuery, CreateJobMutationInput, parseApiError } from '../api/hooks';
import { useEffect, useId, useState } from 'react';
import { useToast } from './ToastProvider';

const cuidChecker = z.string().cuid();

const schema = z.object({
  company: z.string().min(1, 'Company required'),
  role: z.string().min(1, 'Role required'),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  deadline: z.string().optional(),
  tailoringScore: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => (val === undefined ? true : (val ?? 0) >= 0 && (val ?? 0) <= 100), 'Score must be 0-100'),
  outreachEnabled: z.boolean().default(false),
  contactId: z
    .string()
    .optional()
    .transform((val) => {
      if (typeof val !== 'string') {
        return undefined;
      }
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    })
    .refine((val) => val === undefined || cuidChecker.safeParse(val).success, {
      message: 'Contact ID must be a valid ID from the Contacts module'
    }),
  messageType: z.string().optional(),
  personalizationScore: z
    .string()
    .transform((val) => (val ? Number(val) : undefined))
    .optional()
    .refine((val) => (val === undefined ? true : (val ?? 0) >= 0 && (val ?? 0) <= 100), '0-100 score'),
  channel: z.string().optional(),
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
    formState: { errors },
    setError
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      outreachEnabled: !isEditMode,  // Disable outreach in edit mode
      personalizationScore: '80',
      channel: 'EMAIL'
    }
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && jobDetail) {
      reset({
        company: jobDetail.company,
        role: jobDetail.role,
        sourceUrl: jobDetail.sourceUrl || '',
        deadline: jobDetail.deadline ? jobDetail.deadline.split('T')[0] : '',
        outreachEnabled: false,
        tailoringScore: undefined,
        personalizationScore: '80'
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

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      if (isEditMode && jobId) {
        const deadlineIso = values.deadline ? new Date(values.deadline).toISOString() : null;
        await updateJob.mutateAsync({
          id: jobId,
          company: values.company,
          role: values.role,
          sourceUrl: values.sourceUrl ? values.sourceUrl : null,
          deadline: deadlineIso
        });
        toast.success('Job updated');
      } else {
        const payload: CreateJobMutationInput = {
          company: values.company,
          role: values.role,
          sourceUrl: values.sourceUrl ? values.sourceUrl : undefined,
          deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined,
          initialApplication:
            values.tailoringScore !== undefined
              ? {
                  tailoringScore: values.tailoringScore,
                  dateSent: new Date().toISOString()
                }
              : undefined,
          initialOutreach: values.outreachEnabled
            ? {
                contactId: values.contactId,
                channel: (values.channel ?? 'EMAIL').toUpperCase(),
                messageType: values.messageType && values.messageType.length > 0 ? values.messageType : 'intro_request',
                personalizationScore: values.personalizationScore ?? 70,
                content: values.note?.trim() ? values.note.trim() : undefined,
                createFollowUp: true,
                followUpNote: values.note?.trim() || undefined
              }
            : undefined
        };

        await createJob.mutateAsync(payload);
      }

      reset({
        company: '',
        role: '',
        sourceUrl: '',
        deadline: '',
        tailoringScore: undefined,
        outreachEnabled: !isEditMode,
        contactId: undefined,
        channel: 'EMAIL',
        messageType: '',
        personalizationScore: '80',
        note: ''
      });
      setOpen(false);
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed.fieldErrors) {
        const fieldMap: Record<string, keyof FormValues> = {
          company: 'company',
          role: 'role',
          sourceUrl: 'sourceUrl',
          deadline: 'deadline',
          'initialApplication.tailoringScore': 'tailoringScore',
          'initialOutreach.channel': 'channel',
          'initialOutreach.messageType': 'messageType',
          'initialOutreach.personalizationScore': 'personalizationScore',
          'initialOutreach.contactId': 'contactId',
          'initialOutreach.content': 'note'
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
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            {isEditMode ? 'Edit job' : 'New opportunity'}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            {isEditMode
              ? 'Update job details (company, role, URL, deadline)'
              : 'Capture the application with a tailored CV and queue the 3-day follow-up automatically.'}
          </Dialog.Description>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-company`}>
                Company
              </label>
              <input
                id={`${formId}-company`}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                {...register('role')}
              />
              {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
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
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-deadline`}>
                  Deadline
                </label>
                <input
                  type="date"
                  id={`${formId}-deadline`}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                  {...register('deadline')}
                />
              </div>
            </div>
            {!isEditMode && (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-tailoringScore`}>
                    Tailoring score (0-100)
                  </label>
                  <input
                    type="number"
                    id={`${formId}-tailoringScore`}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                    {...register('tailoringScore')}
                  />
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" {...register('outreachEnabled')} />
                    Log outreach now & queue follow-up
                  </label>
                  {outreachEnabled && (
                <div className="mt-3 space-y-3 text-sm">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-contactId`}>
                        Contact ID (optional)
                      </label>
                      <input
                        id={`${formId}-contactId`}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        {...register('contactId')}
                      />
                      {errors.contactId && <p className="mt-1 text-xs text-red-500">{errors.contactId.message}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-channel`}>
                        Channel
                      </label>
                      <select
                        id={`${formId}-channel`}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        {...register('channel')}
                      >
                        <option value="EMAIL">Email</option>
                        <option value="LINKEDIN">LinkedIn</option>
                        <option value="PHONE">Phone</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-messageType`}>
                      Message type
                    </label>
                    <input
                      id={`${formId}-messageType`}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="intro_request"
                      {...register('messageType')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-personalization`}>
                      Personalization (0-100)
                    </label>
                    <input
                      type="number"
                      id={`${formId}-personalization`}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      {...register('personalizationScore')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`${formId}-note`}>
                      Note
                    </label>
                    <textarea
                      id={`${formId}-note`}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      rows={3}
                      {...register('note')}
                    />
                  </div>
                </div>
              )}
                </div>
              </>
            )}
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button type="button" className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-wait disabled:opacity-75"
              >
                {isPending ? 'Saving…' : (isEditMode ? 'Update job' : 'Create job')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
