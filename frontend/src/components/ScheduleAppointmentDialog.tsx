import * as Dialog from '@radix-ui/react-dialog';
import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useScheduleFollowupMutation,
  useUpdateFollowupMutation,
  useDeleteFollowupMutation,
  JobAppointment
} from '../api/hooks';

type JobContact = {
  id: string;
  name: string | null;
  role?: string | null;
};

const appointmentModeValues = ['MEETING', 'ZOOM', 'PHONE', 'ON_SITE', 'OTHER'] as const;
const appointmentModeOptions: Array<{ value: (typeof appointmentModeValues)[number]; label: string }> = [
  { value: 'MEETING', label: 'In-person meeting' },
  { value: 'ZOOM', label: 'Video / Zoom' },
  { value: 'PHONE', label: 'Phone call' },
  { value: 'ON_SITE', label: 'On-site' },
  { value: 'OTHER', label: 'Other' }
];

const normalizeMode = (
  mode?: string | null
): (typeof appointmentModeValues)[number] => {
  return appointmentModeValues.includes(mode as (typeof appointmentModeValues)[number])
    ? (mode as (typeof appointmentModeValues)[number])
    : 'MEETING';
};

interface ScheduleAppointmentDialogProps {
  job: {
    id: string;
    company: string;
    role: string;
    contacts?: JobContact[];
  } | null;
  appointment?: JobAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const scheduleSchema = z.object({
  contactId: z.string().optional(),
  dueAt: z.string().min(1, 'Select a date and time'),
  note: z
    .string()
    .max(500, 'Note must be 500 characters or fewer')
    .optional(),
  appointmentMode: z.enum(appointmentModeValues).default('MEETING')
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

const toInputDateTime = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const ScheduleAppointmentDialog = ({
  job,
  appointment,
  open,
  onOpenChange
}: ScheduleAppointmentDialogProps) => {
  const scheduleFollowup = useScheduleFollowupMutation();
  const updateFollowup = useUpdateFollowupMutation();
  const deleteFollowup = useDeleteFollowupMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      contactId: job?.contacts?.[0]?.id,
      dueAt: '',
      note: '',
      appointmentMode: 'MEETING'
    }
  });

  useEffect(() => {
    if (open) {
      reset({
        contactId: appointment?.contactId ?? job?.contacts?.[0]?.id,
        dueAt: appointment ? toInputDateTime(appointment.dueAt) : '',
        note: appointment?.note ?? '',
        appointmentMode: normalizeMode(appointment?.appointmentMode)
      });
    }
  }, [job, appointment, open, reset]);

  const handleClose = (next: boolean) => {
    if (!next) {
      reset({
        contactId: appointment?.contactId ?? job?.contacts?.[0]?.id,
        dueAt: appointment ? toInputDateTime(appointment.dueAt) : '',
        note: appointment?.note ?? '',
        appointmentMode: normalizeMode(appointment?.appointmentMode)
      });
    }
    onOpenChange(next);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!job) {
      return;
    }
    const dueDate = new Date(values.dueAt);
    if (Number.isNaN(dueDate.getTime())) {
      return;
    }
    const payload = {
      contactId: values.contactId && values.contactId.length > 0 ? values.contactId : undefined,
      dueAt: dueDate.toISOString(),
      note: values.note?.trim() ? values.note.trim() : undefined,
      appointmentMode: values.appointmentMode
    };
    try {
      if (appointment) {
        await updateFollowup.mutateAsync({
          id: appointment.id,
          jobId: job.id,
          contactId: payload.contactId,
          dueAt: payload.dueAt,
          note: payload.note
        });
      } else {
        await scheduleFollowup.mutateAsync({
          jobId: job.id,
          ...payload
        });
      }
      handleClose(false);
    } catch {
      // toast handled in mutation
    }
  });

  const contacts = job?.contacts ?? [];
  const hasContacts = contacts.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            {appointment ? 'Edit appointment' : 'Schedule appointment'}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            {job ? `${job.company} — ${job.role}` : 'Select a job to schedule an appointment.'}
          </Dialog.Description>

          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Contact</label>
              <select
                {...register('contactId')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {hasContacts ? (
                  <>
                    <option value="">None selected</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name ?? 'Unnamed contact'}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="">No linked contacts</option>
                )}
              </select>
              {errors.contactId && (
                <p className="mt-1 text-xs text-red-600">{errors.contactId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Date &amp; time</label>
              <input
                type="datetime-local"
                {...register('dueAt')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {errors.dueAt && <p className="mt-1 text-xs text-red-600">{errors.dueAt.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                rows={3}
                {...register('note')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Add context, meeting location, dial-in, etc."
              />
              {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Meeting type</label>
              <select
                {...register('appointmentMode')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {appointmentModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  disabled={scheduleFollowup.isPending || updateFollowup.isPending || deleteFollowup.isPending}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={scheduleFollowup.isPending || updateFollowup.isPending || !job}
              >
                {scheduleFollowup.isPending || updateFollowup.isPending
                  ? appointment
                    ? 'Saving…'
                    : 'Scheduling…'
                  : appointment
                  ? 'Save changes'
                  : 'Schedule'}
              </button>
            </div>

            {appointment && (
              <div className="border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className="w-full rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  onClick={async () => {
                    if (!job || !appointment) {
                      return;
                    }
                    try {
                      await deleteFollowup.mutateAsync({ id: appointment.id, jobId: job.id });
                      handleClose(false);
                    } catch {
                      // toast handled
                    }
                  }}
                  disabled={deleteFollowup.isPending}
                >
                  {deleteFollowup.isPending ? 'Deleting…' : 'Delete appointment'}
                </button>
              </div>
            )}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
