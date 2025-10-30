import * as Tabs from '@radix-ui/react-tabs';
import { format } from 'date-fns';
import { useBoostsQuery, useEventsQuery, useProjectsQuery, useReviewsQuery } from '../api/hooks';
import { ScoreDial } from '../components/ScoreDial';

export const GrowthPage = () => {
  const { data: reviews } = useReviewsQuery();
  const { data: events } = useEventsQuery();
  const { data: boosts } = useBoostsQuery();
  const { data: projects } = useProjectsQuery();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Growth flywheel</h2>
      <Tabs.Root defaultValue="reviews" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Tabs.List className="flex border-b border-slate-200">
          <Tabs.Trigger value="reviews" className="tab-trigger">
            Senior reviews
          </Tabs.Trigger>
          <Tabs.Trigger value="events" className="tab-trigger">
            Events
          </Tabs.Trigger>
          <Tabs.Trigger value="boosts" className="tab-trigger">
            Boost tasks
          </Tabs.Trigger>
          <Tabs.Trigger value="projects" className="tab-trigger">
            Projects
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="reviews" className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {(reviews ?? []).map((review) => (
              <div key={review.id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">{review.project.name}</h3>
                <p className="text-xs text-slate-500">Reviewed by {review.contact.name}</p>
                <div className="mt-4">
                  <ScoreDial score={review.qualityScore ?? 50} label="Quality" />
                </div>
              </div>
            ))}
            {(reviews ?? []).length === 0 && <p className="text-sm text-slate-500">No reviews logged yet.</p>}
          </div>
        </Tabs.Content>
        <Tabs.Content value="events" className="p-6">
          <ul className="space-y-3">
            {(events ?? []).map((event) => (
              <li key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{event.name}</h3>
                    <p className="text-xs text-slate-500">
                      {format(new Date(event.date), 'PPPP')} · {event.location ?? 'Remote'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${event.status === 'ATTENDED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {event.status.toLowerCase()}
                  </span>
                </div>
              </li>
            ))}
            {(events ?? []).length === 0 && <p className="text-sm text-slate-500">No events scheduled.</p>}
          </ul>
        </Tabs.Content>
        <Tabs.Content value="boosts" className="p-6">
          <ul className="space-y-3">
            {(boosts ?? []).map((boost) => (
              <li
                key={boost.id}
                className={`rounded-xl border px-4 py-3 shadow-sm ${
                  boost.doneAt ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{boost.title}</p>
                <p className="text-xs text-slate-500">Impact score: {boost.impactScore}/10</p>
                {boost.doneAt && (
                  <p className="text-xs text-emerald-600">
                    Completed {format(new Date(boost.doneAt), 'PP')}
                  </p>
                )}
              </li>
            ))}
            {(boosts ?? []).length === 0 && <p className="text-sm text-slate-500">Add boost tasks for dry days.</p>}
          </ul>
        </Tabs.Content>
        <Tabs.Content value="projects" className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {(projects ?? []).map((project) => (
              <article
                key={project.id}
                className={`rounded-xl border px-4 py-4 shadow-sm ${
                  project.spotlight ? 'border-brand bg-brand-muted/40' : 'border-slate-200 bg-white'
                }`}
              >
                <h3 className="text-sm font-semibold text-slate-900">{project.name}</h3>
                <p className="text-xs text-brand">{project.repoUrl}</p>
                <p className="mt-2 text-xs text-slate-500">{project.stack ?? 'Stack TBD'}</p>
                {project.spotlight && <span className="mt-2 inline-block rounded-full bg-brand px-2 py-1 text-xs text-white">Spotlight</span>}
              </article>
            ))}
            {(projects ?? []).length === 0 && <p className="text-sm text-slate-500">No projects logged.</p>}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};
