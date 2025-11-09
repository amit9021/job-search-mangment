import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { TaskModel } from '../../api/hooks';
import { useApi } from '../../api/ApiProvider';
import { TagsInput } from '../TagsInput';

const growTypeOptions = ['boost', 'event', 'review', 'project'] as const;

const taskFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['Todo', 'Doing', 'Done', 'Blocked']),
  priority: z.enum(['Low', 'Med', 'High']),
  dueAt: z.string().optional(),
  startAt: z.string().optional(),
  recurrence: z.string().optional(),
  tags: z.array(z.string()).optional(),
  checklist: z
    .array(
      z.object({
        text: z.string(),
        done: z.boolean()
      })
    )
    .optional(),
  jobId: z.string().optional(),
  contactId: z.string().optional(),
  growType: z.enum(growTypeOptions).optional(),
  growId: z.string().optional()
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const normalizeGrowType = (value?: string | null): TaskFormValues['growType'] => {
  if (!value) {
    return undefined;
  }
  return growTypeOptions.includes(value as (typeof growTypeOptions)[number])
    ? (value as TaskFormValues['growType'])
    : undefined;
};

const toLocalInputValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromLocalInputValue = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

interface TaskDrawerProps {
  task: TaskModel | null;
  open: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (id: string, updates: Record<string, unknown>) => Promise<void>;
}

export const TaskDrawer = ({ task, open, onClose, onSubmit, isSaving = false }: TaskDrawerProps) => {
  const api = useApi();
  const [jobQuery, setJobQuery] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<{ id: string; company: string; role: string | null } | null>(null);
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string | null } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty }
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'Todo',
      priority: 'Med',
      dueAt: '',
      startAt: '',
      recurrence: '',
      tags: [],
      checklist: [],
      jobId: undefined,
      contactId: undefined,
      growType: normalizeGrowType(task?.context.grow?.type),
      growId: task?.context.grow?.id ?? undefined
    }
  });

  const tags = watch('tags') ?? [];
  const checklist = watch('checklist') ?? [];

  useEffect(() => {
    if (!task || !open) {
      return;
    }
    reset({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      dueAt: toLocalInputValue(task.dueAt),
      startAt: toLocalInputValue(task.startAt),
      recurrence: task.recurrence ?? '',
      tags: task.tags ?? [],
      checklist: task.checklist ?? [],
      jobId: task.links.jobId,
      contactId: task.links.contactId,
      growType: normalizeGrowType(task.links.growType ?? task.context.grow?.type),
      growId: task.links.growId ?? (task.context.grow?.id ?? undefined)
    });
    setSelectedJob(task.context.job ?? null);
    setSelectedContact(task.context.contact ?? null);
    setJobQuery('');
    setContactQuery('');
  }, [task, open, reset]);

  const jobSearch = useQuery({
    queryKey: ['tasks', 'job-search', jobQuery],
    enabled: jobQuery.length >= 2,
    queryFn: async () => {
      const { data } = await api.get('/jobs', { params: { query: jobQuery, pageSize: 5 } });
      return data as Array<{ id: string; company: string; role: string | null }>;
    }
  });

  const contactSearch = useQuery({
    queryKey: ['tasks', 'contact-search', contactQuery],
    enabled: contactQuery.length >= 2,
    queryFn: async () => {
      const { data } = await api.get('/contacts', { params: { query: contactQuery, pageSize: 5 } });
      return data as Array<{ id: string; name: string | null }>;
    }
  });

  const handleSave = async (values: TaskFormValues) => {
    if (!task) return;
    const updates: Record<string, unknown> = {
      title: values.title,
      description: values.description ?? '',
      status: values.status,
      priority: values.priority,
      recurrence: values.recurrence?.trim() ? values.recurrence : null,
      tags: tags,
      checklist
    };

    const dueAt = fromLocalInputValue(values.dueAt);
    updates.dueAt = dueAt;
    const startAt = fromLocalInputValue(values.startAt);
    updates.startAt = startAt;

    const links: Record<string, string> = {};
    if (values.jobId) {
      links.jobId = values.jobId;
    }
    if (values.contactId) {
      links.contactId = values.contactId;
    }
    if (values.growType) {
      links.growType = values.growType;
      if (values.growId) {
        links.growId = values.growId;
      }
    }
    if (Object.keys(links).length > 0) {
      updates.links = links;
    } else {
      updates.links = {};
    }

    await onSubmit(task.id, updates);
  };

  const addChecklistItem = () => {
    setValue('checklist', [...checklist, { text: 'New item', done: false }], { shouldDirty: true });
  };

  const updateChecklistItem = (index: number, updates: Partial<{ text: string; done: boolean }>) => {
    const next = [...checklist];
    next[index] = { ...next[index], ...updates };
    setValue('checklist', next, { shouldDirty: true });
  };

  const removeChecklistItem = (index: number) => {
    setValue(
      'checklist',
      checklist.filter((_, idx) => idx !== index),
      { shouldDirty: true }
    );
  };

  const selectedGrowType = watch('growType');

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              {task ? 'Edit task' : 'Task'}
            </Dialog.Title>
            <button
              type="button"
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <form
            className="space-y-6 px-6 py-6"
            onSubmit={handleSubmit(async (values) => {
              await handleSave(values);
              onClose();
            })}
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Title
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand"
                {...register('title')}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </label>
              <textarea
                rows={4}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </label>
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                  {...register('status')}
                >
                  <option value="Todo">Todo</option>
                  <option value="Doing">Doing</option>
                  <option value="Done">Done</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </label>
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                  {...register('priority')}
                >
                  <option value="Low">Low</option>
                  <option value="Med">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Start at
                </label>
                <input
                  type="datetime-local"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                  {...register('startAt')}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Due at
                </label>
                <input
                  type="datetime-local"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                  {...register('dueAt')}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recurrence (RRULE)
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO,WE;BYHOUR=9"
                {...register('recurrence')}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tags
              </label>
              <div className="mt-2">
                <TagsInput value={tags} onChange={(next) => setValue('tags', next, { shouldDirty: true })} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Checklist
                </label>
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="text-xs font-semibold text-brand hover:text-brand/80"
                >
                  + Add item
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {checklist.map((item, index) => (
                  <div key={`${index}-${item.text}`} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(event) => updateChecklistItem(index, { done: event.target.checked })}
                    />
                    <input
                      value={item.text}
                      onChange={(event) => updateChecklistItem(index, { text: event.target.value })}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(index)}
                      className="text-xs text-slate-400 hover:text-rose-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {checklist.length === 0 && (
                  <p className="text-xs text-slate-400">No checklist items yet.</p>
                )}
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Context links</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Job</span>
                    {selectedJob && (
                      <button
                        type="button"
                        className="text-xs text-rose-500 hover:text-rose-600"
                        onClick={() => {
                          setSelectedJob(null);
                          setValue('jobId', undefined, { shouldDirty: true });
                        }}
                      >
                        Unlink
                      </button>
                    )}
                  </div>
                  {selectedJob && (
                    <p className="mt-1 text-xs text-slate-500">
                      Linked to {selectedJob.company} — {selectedJob.role ?? 'Role TBD'}
                    </p>
                  )}
                  <input
                    type="text"
                    value={jobQuery}
                    onChange={(event) => setJobQuery(event.target.value)}
                    placeholder="Search jobs by company or role"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                  />
                  {jobSearch.isSuccess && jobSearch.data.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {jobSearch.data.map((job) => (
                        <button
                          type="button"
                          key={job.id}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:border-brand"
                          onClick={() => {
                            setSelectedJob(job);
                            setValue('jobId', job.id, { shouldDirty: true });
                            setJobQuery('');
                          }}
                        >
                          {job.company} — {job.role ?? 'Role TBD'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Contact</span>
                    {selectedContact && (
                      <button
                        type="button"
                        className="text-xs text-rose-500 hover:text-rose-600"
                        onClick={() => {
                          setSelectedContact(null);
                          setValue('contactId', undefined, { shouldDirty: true });
                        }}
                      >
                        Unlink
                      </button>
                    )}
                  </div>
                  {selectedContact && (
                    <p className="mt-1 text-xs text-slate-500">
                      Linked to {selectedContact.name ?? 'Contact'}
                    </p>
                  )}
                  <input
                    type="text"
                    value={contactQuery}
                    onChange={(event) => setContactQuery(event.target.value)}
                    placeholder="Search contacts by name"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                  />
                  {contactSearch.isSuccess && contactSearch.data.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {contactSearch.data.map((contact) => (
                        <button
                          type="button"
                          key={contact.id}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:border-brand"
                          onClick={() => {
                            setSelectedContact(contact);
                            setValue('contactId', contact.id, { shouldDirty: true });
                            setContactQuery('');
                          }}
                        >
                          {contact.name ?? 'Contact'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Grow type</label>
                    <select
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                      {...register('growType')}
                    >
                      <option value="">—</option>
                      {growTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Grow reference</label>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
                      placeholder="Identifier"
                      {...register('growId')}
                      disabled={!selectedGrowType}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:bg-brand/60"
              >
                {isSaving ? 'Saving…' : isDirty ? 'Save changes' : 'Close'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
