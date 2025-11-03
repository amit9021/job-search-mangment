import { useMemo, useState } from 'react';
import { isSameMonth } from 'date-fns';
import {
  BoostSuggestion,
  GrowthBoostTask,
  useBoostSuggestionsMutation,
  useBoostsQuery,
  useCreateGrowthBoostTaskMutation,
  useCreateGrowthEventMutation,
  useCreateGrowthReviewMutation,
  useCreateProjectHighlightMutation,
  useEventsQuery,
  useProjectsQuery,
  useReviewsQuery,
  useUpdateGrowthBoostTaskMutation
} from '../api/hooks';
import { ReviewCard } from '../components/grow/ReviewCard';
import { EventCard } from '../components/grow/EventCard';
import { BoostTaskCard } from '../components/grow/BoostTaskCard';
import { ProjectCard } from '../components/grow/ProjectCard';
import { AddGrowItemModal, GrowItemType, GrowModalPayloads } from '../components/grow/AddGrowItemModal';

const pluralize = (value: number, noun: string) => `${value} ${noun}${value === 1 ? '' : 's'}`;

export const GrowPage = () => {
  const { data: reviews = [] } = useReviewsQuery();
  const { data: events = [] } = useEventsQuery();
  const { data: boosts = [] } = useBoostsQuery();
  const { data: projects = [] } = useProjectsQuery();

  const createReview = useCreateGrowthReviewMutation();
  const createEvent = useCreateGrowthEventMutation();
  const createBoost = useCreateGrowthBoostTaskMutation();
  const updateBoost = useUpdateGrowthBoostTaskMutation();
  const createProject = useCreateProjectHighlightMutation();
  const suggestionMutation = useBoostSuggestionsMutation();

  const [modalType, setModalType] = useState<GrowItemType | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<BoostSuggestion[]>([]);

  const handleOpenModal = (type: GrowItemType) => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setModalType(null);
    }
  };

  const modalSubmitting =
    modalType === 'review'
      ? createReview.isPending
      : modalType === 'event'
      ? createEvent.isPending
      : modalType === 'boost'
      ? createBoost.isPending
      : modalType === 'project'
      ? createProject.isPending
      : false;

  const handleModalSubmit = async <T extends GrowItemType>(type: T, payload: GrowModalPayloads[T]) => {
    switch (type) {
      case 'review':
        await createReview.mutateAsync(payload as Parameters<typeof createReview.mutateAsync>[0]);
        break;
      case 'event':
        await createEvent.mutateAsync(payload as Parameters<typeof createEvent.mutateAsync>[0]);
        break;
      case 'boost':
        await createBoost.mutateAsync(payload as Parameters<typeof createBoost.mutateAsync>[0]);
        break;
      case 'project':
        await createProject.mutateAsync(payload as Parameters<typeof createProject.mutateAsync>[0]);
        break;
      default:
        break;
    }
  };

  const handleUpdateBoostStatus = async (taskId: string, status: GrowthBoostTask['status']) => {
    await updateBoost.mutateAsync({
      id: taskId,
      data: { status }
    });
  };

  const handleSuggestBoosts = async () => {
    const result = await suggestionMutation.mutateAsync();
    setSuggestions(result);
  };

  const handleAddSuggestion = async (suggestion: BoostSuggestion) => {
    await createBoost.mutateAsync({
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category,
      impactLevel: suggestion.impactLevel,
      tags: suggestion.tags
    });
    setSuggestions((prev) => prev.filter((item) => item.title !== suggestion.title));
  };

  const now = new Date();
  const reviewsThisMonth = reviews.filter((review) => isSameMonth(new Date(review.reviewedAt), now)).length;
  const eventsAttendedThisMonth = events.filter((event) => event.attended && isSameMonth(new Date(event.date), now)).length;
  const boostsCompletedThisMonth = boosts.filter((task) => task.status === 'completed' && task.completedAt && isSameMonth(new Date(task.completedAt), now)).length;

  const progressSummary = useMemo(() => {
    const parts = [
      `attended ${pluralize(eventsAttendedThisMonth, 'event')}`,
      `completed ${pluralize(boostsCompletedThisMonth, 'boost task')}`,
      `logged ${pluralize(reviewsThisMonth, 'review')}`
    ];
    return `You’ve ${parts.join(', ')} this month.`;
  }, [eventsAttendedThisMonth, boostsCompletedThisMonth, reviewsThisMonth]);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Growth momentum</h2>
            <p className="text-sm text-slate-500">
              {progressSummary} Keep stacking small wins to stay visible and learning.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
              <p className="text-xs uppercase text-blue-600">Reviews</p>
              <p className="text-lg font-semibold text-slate-900">{reviewsThisMonth}</p>
            </div>
            <div className="rounded-lg bg-purple-50 px-3 py-2 text-center">
              <p className="text-xs uppercase text-purple-600">Events</p>
              <p className="text-lg font-semibold text-slate-900">{eventsAttendedThisMonth}</p>
            </div>
            <div className="rounded-lg bg-orange-50 px-3 py-2 text-center">
              <p className="text-xs uppercase text-orange-600">Boosts done</p>
              <p className="text-lg font-semibold text-slate-900">{boostsCompletedThisMonth}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Senior reviews</h3>
            <p className="text-sm text-slate-500">Keep a pulse on feedback from senior mentors and hiring signals.</p>
          </div>
          <button
            onClick={() => handleOpenModal('review')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Log review
          </button>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          {reviews.length === 0 && <p className="rounded-lg border border-dashed border-blue-200 p-6 text-sm text-slate-500">No reviews logged yet—capture your next feedback session to keep learnings centralised.</p>}
        </div>
      </section>

      <section className="space-y-6">
        <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Events & meetups</h3>
            <p className="text-sm text-slate-500">Surface follow-ups and keep visibility high with peers and leads.</p>
          </div>
          <button
            onClick={() => handleOpenModal('event')}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
          >
            Add event
          </button>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {events.length === 0 && <p className="rounded-lg border border-dashed border-purple-200 p-6 text-sm text-slate-500">No events tracked. Register for an industry session to grow your network this month.</p>}
        </div>
      </section>

      <section className="space-y-6">
        <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Boost tasks</h3>
            <p className="text-sm text-slate-500">Close skill gaps, grow visibility, and nurture new relationships.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenModal('boost')}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              Add boost task
            </button>
            <button
              onClick={handleSuggestBoosts}
              disabled={suggestionMutation.isPending}
              className="rounded-md border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:bg-orange-100 disabled:text-orange-400"
            >
              {suggestionMutation.isPending ? 'Calculating…' : 'Suggest boosts'}
            </button>
          </div>
        </header>
        {suggestions.length > 0 && (
          <div className="space-y-3 rounded-xl border border-orange-200 bg-white p-4">
            <p className="text-sm font-semibold text-orange-700">Suggested boost tasks</p>
            <ul className="space-y-3">
              {suggestions.map((suggestion) => (
                <li key={suggestion.title} className="rounded-lg border border-orange-100 bg-orange-50/80 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{suggestion.title}</p>
                      {suggestion.description && <p className="text-sm text-slate-600">{suggestion.description}</p>}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-orange-600">
                        <span className="rounded-full bg-orange-100 px-2 py-1 font-medium">{suggestion.category.replace('-', ' ')}</span>
                        <span className="rounded-full bg-orange-100 px-2 py-1 font-medium">
                          {Array.from({ length: suggestion.impactLevel }, () => '🔥').join('')}
                        </span>
                        {(suggestion.tags ?? []).map((tag) => (
                          <span key={`${suggestion.title}-${tag}`} className="rounded-full bg-white px-2 py-1">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddSuggestion(suggestion)}
                      disabled={createBoost.isPending}
                      className={`self-start rounded-md px-3 py-1 text-sm font-semibold text-white transition md:self-center ${
                        createBoost.isPending ? 'cursor-not-allowed bg-orange-300' : 'bg-orange-500 hover:bg-orange-600'
                      }`}
                    >
                      {createBoost.isPending ? 'Adding…' : 'Add to my tasks'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {boosts.map((task) => (
            <BoostTaskCard key={task.id} task={task} onStatusChange={handleUpdateBoostStatus} />
          ))}
          {boosts.length === 0 && <p className="rounded-lg border border-dashed border-orange-200 p-6 text-sm text-slate-500">No boost tasks yet. Use the suggest button to generate high impact ideas.</p>}
        </div>
      </section>

      <section className="space-y-6">
        <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Projects & posts</h3>
            <p className="text-sm text-slate-500">Spotlight wins and plan posts to increase your signal with hiring teams.</p>
          </div>
          <button
            onClick={() => handleOpenModal('project')}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            Add highlight
          </button>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((highlight) => (
            <ProjectCard key={highlight.id} highlight={highlight} />
          ))}
          {projects.length === 0 && <p className="rounded-lg border border-dashed border-teal-200 p-6 text-sm text-slate-500">No project highlights yet. Share a recent win to stay visible.</p>}
        </div>
      </section>

      <AddGrowItemModal
        open={isModalOpen}
        type={modalType}
        isSubmitting={modalSubmitting}
        onOpenChange={handleModalOpenChange}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};
