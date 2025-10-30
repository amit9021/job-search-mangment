import * as Dialog from '@radix-ui/react-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateJobMutation } from '../api/hooks';
import { useState } from 'react';

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
  contactId: z.string().optional(),
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

export const JobWizardModal = () => {
  const createJob = useCreateJobMutation();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      outreachEnabled: true,
      personalizationScore: '80'
    }
  });

  const outreachEnabled = watch('outreachEnabled');

  const onSubmit = handleSubmit(async (values) => {
    await createJob.mutateAsync({
      company: values.company,
      role: values.role,
      sourceUrl: values.sourceUrl || undefined,
      deadline: values.deadline || undefined,
      initialApplication: values.tailoringScore !== undefined
        ? {
            tailoringScore: values.tailoringScore,
            dateSent: new Date().toISOString()
          }
        : undefined,
      initialOutreach: values.outreachEnabled
        ? {
            contactId: values.contactId || undefined,
            channel: values.channel ?? 'EMAIL',
            messageType: values.messageType ?? 'intro_request',
            personalizationScore: values.personalizationScore ?? 70,
            content: values.note
          }
        : undefined
    });
    reset();
    setOpen(false);
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600">
          Add job & outreach
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">New opportunity</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            Capture the application with a tailored CV and queue the 3-day follow-up automatically.
          </Dialog.Description>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Company</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                {...register('company')}
              />
              {errors.company && <p className="text-xs text-red-500">{errors.company.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Role</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                {...register('role')}
              />
              {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Source URL</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                  placeholder="https://"
                  {...register('sourceUrl')}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Deadline</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20"
                  {...register('deadline')}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Tailoring score (0-100)</label>
              <input
                type="number"
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
                      <label className="text-xs font-semibold uppercase text-slate-500">Contact ID (optional)</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        {...register('contactId')}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Channel</label>
                      <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register('channel')}>
                        <option value="EMAIL">Email</option>
                        <option value="LINKEDIN">LinkedIn</option>
                        <option value="PHONE">Phone</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Message type</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="intro_request"
                      {...register('messageType')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Personalization (0-100)</label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      {...register('personalizationScore')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Note</label>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      rows={3}
                      {...register('note')}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button type="button" className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={createJob.isPending}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-wait disabled:opacity-75"
              >
                {createJob.isPending ? 'Saving…' : 'Create job'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
