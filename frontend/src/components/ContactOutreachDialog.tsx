import * as Dialog from '@radix-ui/react-dialog';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useCreateContactOutreachMutation } from '../api/hooks';

const trimToUndefined = (value?: string | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const channelOptions = ['EMAIL', 'LINKEDIN', 'PHONE', 'OTHER'] as const;
const contextOptions = ['JOB_OPPORTUNITY', 'CODE_REVIEW', 'CHECK_IN', 'REFERRAL_REQUEST', 'OTHER'] as const;
const outcomeOptions = ['NONE', 'NO_RESPONSE', 'POSITIVE', 'NEGATIVE'] as const;

const contactOutreachSchema = z.object({
  channel: z.enum(channelOptions),
  messageType: z.string().min(1, 'Message type is required'),
  context: z.enum(contextOptions).default('CHECK_IN'),
  outcome: z.enum(outcomeOptions).default('NONE'),
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

type ContactOutreachFormValues = z.infer<typeof contactOutreachSchema>;

interface ContactOutreachDialogProps {
  contact: {
    id: string;
    name: string;
    role?: string | null;
    email?: string | null;
    company?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContactOutreachDialog = ({
  contact,
  open,
  onOpenChange
}: ContactOutreachDialogProps) => {
  const createOutreach = useCreateContactOutreachMutation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<ContactOutreachFormValues>({
    resolver: zodResolver(contactOutreachSchema),
    defaultValues: {
      channel: 'EMAIL',
      messageType: 'check_in',
      context: 'CHECK_IN',
      outcome: 'NONE',
      personalizationScore: 70,
      createFollowUp: true
    }
  });

  const createFollowUpEnabled = watch('createFollowUp');

  useEffect(() => {
    if (!open) {
      reset({
        channel: 'EMAIL',
        messageType: 'check_in',
        context: 'CHECK_IN',
        outcome: 'NONE',
        personalizationScore: 70,
        createFollowUp: true,
        content: undefined,
        followUpNote: undefined
      });
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createOutreach.mutateAsync({
        contactId: contact.id,
        channel: values.channel,
        messageType: values.messageType,
        context: values.context,
        outcome: values.outcome,
        personalizationScore: values.personalizationScore ?? 70,
        content: values.content,
        createFollowUp: values.createFollowUp,
        followUpNote: values.followUpNote,
        contactName: contact.name
      });
      onOpenChange(false);
    } catch {
      // error handled by toast in hook
    }
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                Log outreach — {contact.name}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500">
                Track touchpoints even when they are not tied to a job.
              </Dialog.Description>
            </div>
            <Dialog.Close className="text-slate-400 hover:text-slate-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">{contact.name}</p>
            <p className="text-xs text-slate-500">
              {[contact.role, contact.company].filter(Boolean).join(' • ') || '—'}
            </p>
            {contact.email && <p className="text-xs text-slate-400">{contact.email}</p>}
          </div>

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Channel</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  {...register('channel')}
                >
                  {channelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Message type</label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. intro_request"
                  {...register('messageType')}
                />
                {errors.messageType && (
                  <p className="mt-1 text-xs text-red-600">{errors.messageType.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Context</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize"
                  {...register('context')}
                >
                  {contextOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Outcome</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize"
                  {...register('outcome')}
                >
                  {outcomeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.toLowerCase().replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Personalization score</label>
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register('personalizationScore')}
              />
              {errors.personalizationScore && (
                <p className="mt-1 text-xs text-red-600">{errors.personalizationScore.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Add context or snippets from the outreach…"
                {...register('content')}
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" className="rounded border-slate-300" {...register('createFollowUp')} />
              Create follow-up reminder
            </label>

            {createFollowUpEnabled && (
              <div>
                <label className="block text-sm font-medium text-slate-700">Follow-up note</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Reminder details…"
                  {...register('followUpNote')}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close
                type="button"
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                disabled={createOutreach.isPending}
              >
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={createOutreach.isPending}
              >
                {createOutreach.isPending ? 'Saving…' : 'Log outreach'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
