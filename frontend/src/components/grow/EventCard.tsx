import { format } from 'date-fns';
import type { GrowthEvent } from '../../api/hooks';

interface EventCardProps {
  event: GrowthEvent;
}

export const EventCard = ({ event }: EventCardProps) => {
  return (
    <article className="flex h-full flex-col rounded-xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-purple-600">Event / Meetup</p>
          <h3 className="text-base font-semibold text-slate-900">{event.name}</h3>
          <p className="text-xs text-slate-500">
            {format(new Date(event.date), 'PPPP')}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            event.attended ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
          }`}
        >
          {event.attended ? 'Attended' : 'Planned'}
        </span>
      </header>
      {event.notes && <p className="mt-3 text-sm text-slate-700">{event.notes}</p>}
      {event.followUps.length > 0 && (
        <div className="mt-3 rounded-lg bg-white/70 p-3">
          <p className="text-xs font-semibold uppercase text-purple-600">Follow-ups</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {event.followUps.map((item, index) => (
              <li key={`${event.id}-followup-${index}`} className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};
