import * as Dialog from '@radix-ui/react-dialog';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useUpdateJobStageMutation } from '../api/hooks';

const stageOptions = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'HR', label: 'HR' },
  { value: 'TECH', label: 'Tech' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DORMANT', label: 'Dormant' }
];

interface UpdateJobStageDialogProps {
  jobId: string;
  currentStage: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

type StageFormValues = {
  stage: string;
  note?: string;
};

export const UpdateJobStageDialog = ({
  jobId,
  currentStage,
  open,
  onOpenChange,
  onUpdated
}: UpdateJobStageDialogProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<StageFormValues>({
    defaultValues: {
      stage: currentStage,
      note: ''
    }
  });

  const updateStage = useUpdateJobStageMutation();

  useEffect(() => {
    if (open) {
      reset({ stage: currentStage, note: '' });
    }
  }, [open, currentStage, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!values.stage) return;
    try {
      await updateStage.mutateAsync({
        jobId,
        stage: values.stage,
        note: values.note
      });
      onOpenChange(false);
      onUpdated?.();
    } catch {
      // handled globally
    }
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            Update stage
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            Move the job to the next step and add an optional note.
          </Dialog.Description>

          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Stage</label>
              <select
                {...register('stage', { required: 'Pick a stage' })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {stageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.stage && (
                <p className="mt-1 text-xs text-red-600">{errors.stage.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Note</label>
              <textarea
                rows={3}
                {...register('note')}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Optional context that will show in the history."
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  disabled={updateStage.isPending}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={updateStage.isPending}
              >
                {updateStage.isPending ? 'Saving…' : 'Update stage'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
