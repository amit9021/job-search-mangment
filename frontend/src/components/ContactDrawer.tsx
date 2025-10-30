import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect } from 'react';
import { useContactDetailQuery, useUpdateContactMutation } from '../api/hooks';
import { CompanySelect } from './CompanySelect';
import { TagsInput } from './TagsInput';
import { StrengthBadge } from './StrengthBadge';

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

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactDrawerProps {
  contactId: string | null;
  open: boolean;
  onClose: () => void;
}

export const ContactDrawer = ({ contactId, open, onClose }: ContactDrawerProps) => {
  const { data: contact, isLoading } = useContactDetailQuery(contactId || '');
  const updateContact = useUpdateContactMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema)
  });

  const tags = watch('tags') || [];
  const companyValue = watch('companyName') || contact?.company?.name || '';

  // Populate form when contact data loads
  useEffect(() => {
    if (contact) {
      reset({
        name: contact.name,
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
    }
  }, [contact, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!contactId) return;

    await updateContact.mutateAsync({
      id: contactId,
      ...values
    });

    onClose();
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
      default:
        return null;
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 overflow-y-auto">
          {isLoading || !contact ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Dialog.Title className="text-2xl font-bold text-gray-900">
                      {contact.name}
                    </Dialog.Title>
                    {contact.role && (
                      <div className="mt-1 text-gray-600">{contact.role}</div>
                    )}
                    {contact.company && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                          {contact.company.name}
                        </span>
                      </div>
                    )}
                    <div className="mt-2">
                      <StrengthBadge strength={contact.strength} />
                    </div>
                  </div>
                  <Dialog.Close className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Dialog.Close>
                </div>
              </div>

              {/* Tabs */}
              <Tabs.Root defaultValue="details" className="flex-1 flex flex-col">
                <Tabs.List className="flex border-b border-gray-200 px-6">
                  <Tabs.Trigger
                    value="details"
                    className="px-4 py-3 text-sm font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600"
                  >
                    Details
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="timeline"
                    className="px-4 py-3 text-sm font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600"
                  >
                    Timeline ({contact.timeline?.length || 0})
                  </Tabs.Trigger>
                </Tabs.List>

                {/* Details Tab */}
                <Tabs.Content value="details" className="flex-1 overflow-y-auto p-6">
                  <form onSubmit={onSubmit} className="space-y-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        {...register('name')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company
                      </label>
                      <CompanySelect
                        value={companyValue}
                        onChange={({ companyId, companyName }) => {
                          if (companyId) setValue('companyId', companyId, { shouldDirty: true });
                          if (companyName) setValue('companyName', companyName, { shouldDirty: true });
                        }}
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <input
                        {...register('role')}
                        placeholder="e.g. Senior Engineer, Hiring Manager"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="email@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        placeholder="+1-555-0123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>

                    {/* LinkedIn */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LinkedIn URL
                      </label>
                      <input
                        {...register('linkedinUrl')}
                        type="url"
                        placeholder="https://linkedin.com/in/username"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.linkedinUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.linkedinUrl.message}</p>
                      )}
                    </div>

                    {/* GitHub */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GitHub URL
                      </label>
                      <input
                        {...register('githubUrl')}
                        type="url"
                        placeholder="https://github.com/username"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.githubUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.githubUrl.message}</p>
                      )}
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        {...register('location')}
                        placeholder="e.g. San Francisco, CA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags
                      </label>
                      <TagsInput
                        value={tags}
                        onChange={(newTags) => setValue('tags', newTags, { shouldDirty: true })}
                      />
                    </div>

                    {/* Strength */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relationship Strength
                      </label>
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

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        {...register('notes')}
                        rows={4}
                        placeholder="Add notes about this contact..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        type="submit"
                        disabled={!isDirty || updateContact.isPending}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {updateContact.isPending ? 'Saving...' : 'Save Changes'}
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
                </Tabs.Content>

                {/* Timeline Tab */}
                <Tabs.Content value="timeline" className="flex-1 overflow-y-auto p-6">
                  {contact.timeline && contact.timeline.length > 0 ? (
                    <div className="space-y-6">
                      {contact.timeline.map((item, index) => (
                        <div key={index} className="flex gap-4">
                          {getTimelineIcon(item.type)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900 capitalize">
                                {item.type}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(item.date)}
                              </div>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {item.type === 'outreach' && (
                                <div>
                                  <div>Channel: {item.data.channel}</div>
                                  <div>Outcome: {item.data.outcome || 'Pending'}</div>
                                </div>
                              )}
                              {item.type === 'referral' && (
                                <div>
                                  <div>Kind: {item.data.kind}</div>
                                  {item.data.job && <div>For: {item.data.job.company} - {item.data.job.role}</div>}
                                </div>
                              )}
                              {item.type === 'review' && (
                                <div>
                                  <div>Project: {item.data.project?.name}</div>
                                  {item.data.qualityScore && <div>Score: {item.data.qualityScore}/100</div>}
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
                      <div className="text-sm text-gray-500">
                        Outreach, referrals, and code reviews will appear here
                      </div>
                    </div>
                  )}
                </Tabs.Content>
              </Tabs.Root>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
