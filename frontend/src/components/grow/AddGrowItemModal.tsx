import * as Dialog from '@radix-ui/react-dialog';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useContactSearchQuery } from '../../api/hooks';

export type GrowItemType = 'review' | 'event' | 'boost' | 'project';

export type ReviewPayload = {
  reviewerId: string;
  projectName: string;
  summary: string;
  score: number;
  takeaways?: string;
};

export type EventPayload = {
  name: string;
  date: Date;
  location?: string;
  attended: boolean;
  notes?: string;
  followUps?: string[];
};

export type BoostPayload = {
  title: string;
  description?: string;
  category: 'skills-gap' | 'visibility-gap' | 'network-gap';
  impactLevel: number;
  tags?: string[];
};

export type ProjectPayload = {
  projectName: string;
  platformUrl?: string;
  spotlight: boolean;
  plannedPost?: string;
  published: boolean;
  publishedAt?: Date | null;
};

export type GrowModalPayloads = {
  review: ReviewPayload;
  event: EventPayload;
  boost: BoostPayload;
  project: ProjectPayload;
};

const initialReviewState = {
  reviewerId: '',
  reviewerLabel: '',
  projectName: '',
  summary: '',
  score: 4,
  takeaways: ''
};

const initialEventState = {
  name: '',
  date: new Date(),
  location: '',
  attended: false,
  notes: '',
  followUps: ''
};

const initialBoostState = {
  title: '',
  description: '',
  category: 'skills-gap' as BoostPayload['category'],
  impactLevel: 3,
  tags: ''
};

const initialProjectState = {
  projectName: '',
  platformUrl: '',
  spotlight: false,
  plannedPost: '',
  published: false,
  publishedAt: ''
};

const titles: Record<GrowItemType, string> = {
  review: 'Log senior review',
  event: 'Add event / meetup',
  boost: 'Add boost task',
  project: 'Add project highlight'
};

interface AddGrowItemModalProps {
  open: boolean;
  type: GrowItemType | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: <T extends GrowItemType>(type: T, payload: GrowModalPayloads[T]) => Promise<void>;
}

export const AddGrowItemModal = ({ open, type, isSubmitting = false, onOpenChange, onSubmit }: AddGrowItemModalProps) => {
  const [reviewForm, setReviewForm] = useState(initialReviewState);
  const [eventForm, setEventForm] = useState(initialEventState);
  const [boostForm, setBoostForm] = useState(initialBoostState);
  const [projectForm, setProjectForm] = useState(initialProjectState);
  const [formError, setFormError] = useState<string | null>(null);
  const [contactQuery, setContactQuery] = useState('');
  const [contactLookupEnabled, setContactLookupEnabled] = useState(false);

  const { data: contactResults } = useContactSearchQuery(contactQuery, {
    enabled: open && type === 'review' && contactLookupEnabled,
    limit: 6
  });

  useEffect(() => {
    if (!open) {
      setReviewForm(initialReviewState);
      setEventForm({ ...initialEventState, date: new Date() });
      setBoostForm(initialBoostState);
      setProjectForm(initialProjectState);
      setFormError(null);
      setContactQuery('');
      setContactLookupEnabled(false);
    } else {
      setFormError(null);
    }
  }, [open, type]);

  useEffect(() => {
    if (contactQuery.trim().length < 2) {
      setContactLookupEnabled(false);
    } else {
      setContactLookupEnabled(true);
    }
  }, [contactQuery]);

  const modalTitle = type ? titles[type] : 'Add growth item';

  const hasReviewSelection = reviewForm.reviewerId.length > 0;
  const reviewSubmitDisabled =
    !hasReviewSelection || reviewForm.projectName.trim().length === 0 || reviewForm.summary.trim().length === 0;
  const eventSubmitDisabled = eventForm.name.trim().length === 0;
  const boostSubmitDisabled = boostForm.title.trim().length === 0;
  const projectSubmitDisabled = projectForm.projectName.trim().length === 0;

  const isSubmitDisabled = useMemo(() => {
    if (!type) return true;
    if (type === 'review') return reviewSubmitDisabled || isSubmitting;
    if (type === 'event') return eventSubmitDisabled || isSubmitting;
    if (type === 'boost') return boostSubmitDisabled || isSubmitting;
    if (type === 'project') return projectSubmitDisabled || isSubmitting;
    return true;
  }, [type, reviewSubmitDisabled, eventSubmitDisabled, boostSubmitDisabled, projectSubmitDisabled, isSubmitting]);

  const handleReviewSubmit = async () => {
    if (reviewSubmitDisabled || !type) return;
    const payload: ReviewPayload = {
      reviewerId: reviewForm.reviewerId,
      projectName: reviewForm.projectName.trim(),
      summary: reviewForm.summary.trim(),
      score: Number(reviewForm.score),
      takeaways: reviewForm.takeaways.trim().length > 0 ? reviewForm.takeaways.trim() : undefined
    };
    await onSubmit('review', payload);
  };

  const handleEventSubmit = async () => {
    if (eventSubmitDisabled || !type) return;
    const payload: EventPayload = {
      name: eventForm.name.trim(),
      date: eventForm.date,
      location: eventForm.location.trim().length > 0 ? eventForm.location.trim() : undefined,
      attended: eventForm.attended,
      notes: eventForm.notes.trim().length > 0 ? eventForm.notes.trim() : undefined,
      followUps:
        eventForm.followUps.trim().length > 0
          ? eventForm.followUps
              .split('\n')
              .map((item) => item.trim())
              .filter((item) => item.length > 0)
          : undefined
    };
    await onSubmit('event', payload);
  };

  const handleBoostSubmit = async () => {
    if (boostSubmitDisabled || !type) return;
    const tags =
      boostForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0) ?? [];

    const payload: BoostPayload = {
      title: boostForm.title.trim(),
      description: boostForm.description.trim().length > 0 ? boostForm.description.trim() : undefined,
      category: boostForm.category,
      impactLevel: Number(boostForm.impactLevel),
      tags: tags.length > 0 ? tags : undefined
    };
    await onSubmit('boost', payload);
  };

  const handleProjectSubmit = async () => {
    if (projectSubmitDisabled || !type) return;
    const payload: ProjectPayload = {
      projectName: projectForm.projectName.trim(),
      platformUrl: projectForm.platformUrl.trim().length > 0 ? projectForm.platformUrl.trim() : undefined,
      spotlight: projectForm.spotlight,
      plannedPost: projectForm.plannedPost.trim().length > 0 ? projectForm.plannedPost.trim() : undefined,
      published: projectForm.published,
      publishedAt:
        projectForm.published && projectForm.publishedAt
          ? new Date(projectForm.publishedAt)
          : projectForm.published
          ? new Date()
          : null
    };
    await onSubmit('project', payload);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!type) return;
    setFormError(null);
    try {
      if (type === 'review') {
        await handleReviewSubmit();
      } else if (type === 'event') {
        await handleEventSubmit();
      } else if (type === 'boost') {
        await handleBoostSubmit();
      } else if (type === 'project') {
        await handleProjectSubmit();
      }
      onOpenChange(false);
    } catch (error) {
      setFormError('Unable to save item. Check required fields.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50" />
        <Dialog.Content className="fixed inset-x-0 top-1/2 z-50 mx-auto w-full max-w-lg -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">{modalTitle}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                {type === 'review' && 'Capture actionable feedback from senior contacts.'}
                {type === 'event' && 'Track events so you can follow up with new connections.'}
                {type === 'boost' && 'Plan growth boosts to close skill, visibility, or network gaps.'}
                {type === 'project' && 'Highlight project wins and visibility plays.'}
              </Dialog.Description>
            </div>

            {formError && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{formError}</div>}

            {type === 'review' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Reviewer</label>
                  <input
                    type="search"
                    value={reviewForm.reviewerLabel}
                    onChange={(event) => {
                      setReviewForm((prev) => ({ ...prev, reviewerLabel: event.target.value, reviewerId: '' }));
                      setContactQuery(event.target.value);
                    }}
                    placeholder="Search contacts by name"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                  {contactResults && contactResults.length > 0 && !hasReviewSelection && (
                    <ul className="mt-2 max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white">
                      {contactResults.map((contact) => (
                        <li key={contact.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-muted/40"
                            onClick={() => {
                              setReviewForm((prev) => ({
                                ...prev,
                                reviewerId: contact.id,
                                reviewerLabel: contact.name
                              }));
                              setContactQuery('');
                            }}
                          >
                            <span className="font-semibold text-slate-900">{contact.name}</span>
                            {contact.company?.name && <span className="text-xs text-slate-500"> · {contact.company.name}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {hasReviewSelection && (
                    <div className="mt-2 flex items-center justify-between text-xs text-emerald-600">
                      <span>Reviewer selected.</span>
                      <button
                        type="button"
                        className="text-emerald-700 underline"
                        onClick={() => {
                          setReviewForm(initialReviewState);
                          setContactQuery('');
                          setContactLookupEnabled(false);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Project name</label>
                  <input
                    value={reviewForm.projectName}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, projectName: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Summary</label>
                  <textarea
                    value={reviewForm.summary}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, summary: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700">Score (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={reviewForm.score}
                      onChange={(event) =>
                        setReviewForm((prev) => ({ ...prev, score: Number(event.target.value) || 1 }))
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700">Takeaways (optional)</label>
                    <textarea
                      value={reviewForm.takeaways}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, takeaways: event.target.value }))}
                      rows={2}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                    />
                  </div>
                </div>
              </div>
            )}

            {type === 'event' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Name</label>
                  <input
                    value={eventForm.name}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700">Date</label>
                    <input
                      type="date"
                      value={eventForm.date.toISOString().slice(0, 10)}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, date: new Date(event.target.value) }))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700">Location</label>
                    <input
                      value={eventForm.location}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, location: event.target.value }))}
                      placeholder="Tel Aviv, Remote, ..."
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="event-attended"
                    type="checkbox"
                    checked={eventForm.attended}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, attended: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <label htmlFor="event-attended" className="text-sm text-slate-700">
                    Already attended
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    value={eventForm.notes}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Follow-ups (one per line)</label>
                  <textarea
                    value={eventForm.followUps}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, followUps: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
              </div>
            )}

            {type === 'boost' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Title</label>
                  <input
                    value={boostForm.title}
                    onChange={(event) => setBoostForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={boostForm.description}
                    onChange={(event) => setBoostForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700">Category</label>
                    <select
                      value={boostForm.category}
                      onChange={(event) =>
                        setBoostForm((prev) => ({ ...prev, category: event.target.value as BoostPayload['category'] }))
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                    >
                      <option value="skills-gap">Skills gap</option>
                      <option value="visibility-gap">Visibility gap</option>
                      <option value="network-gap">Network gap</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700">Impact level (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={boostForm.impactLevel}
                      onChange={(event) =>
                        setBoostForm((prev) => ({ ...prev, impactLevel: Number(event.target.value) || 1 }))
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Tags (comma separated)</label>
                  <input
                    value={boostForm.tags}
                    onChange={(event) => setBoostForm((prev) => ({ ...prev, tags: event.target.value }))}
                    placeholder="typescript, outreach, visibility"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
              </div>
            )}

            {type === 'project' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Project name</label>
                  <input
                    value={projectForm.projectName}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, projectName: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Platform URL</label>
                  <input
                    value={projectForm.platformUrl}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, platformUrl: event.target.value }))}
                    placeholder="https://linkedin.com/posts/..."
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="project-spotlight"
                    type="checkbox"
                    checked={projectForm.spotlight}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, spotlight: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <label htmlFor="project-spotlight" className="text-sm text-slate-700">
                    Spotlight this project
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Planned post</label>
                  <textarea
                    value={projectForm.plannedPost}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, plannedPost: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="project-published"
                    type="checkbox"
                    checked={projectForm.published}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, published: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <label htmlFor="project-published" className="text-sm text-slate-700">
                    Mark as published
                  </label>
                </div>
                {projectForm.published && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Published date</label>
                    <input
                      type="date"
                      value={projectForm.publishedAt ? projectForm.publishedAt : new Date().toISOString().slice(0, 10)}
                      onChange={(event) => setProjectForm((prev) => ({ ...prev, publishedAt: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Dialog.Close className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition ${
                  isSubmitDisabled ? 'cursor-not-allowed bg-slate-400' : 'bg-brand hover:bg-brand/90'
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
