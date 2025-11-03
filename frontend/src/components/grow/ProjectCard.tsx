import type { ProjectHighlight } from '../../api/hooks';

interface ProjectCardProps {
  highlight: ProjectHighlight;
}

export const ProjectCard = ({ highlight }: ProjectCardProps) => {
  return (
    <article
      className={`flex h-full flex-col rounded-xl border p-4 shadow-sm ${
        highlight.spotlight ? 'border-teal-300 bg-teal-50/70' : 'border-teal-100 bg-white'
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Project Highlight</p>
          <h3 className="text-base font-semibold text-slate-900">{highlight.projectName}</h3>
          {highlight.platformUrl && (
            <a
              href={highlight.platformUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-teal-700 underline"
            >
              {highlight.platformUrl}
            </a>
          )}
        </div>
        {highlight.spotlight && <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700">Spotlight</span>}
      </header>
      {highlight.plannedPost && (
        <div className="mt-3 rounded-lg bg-teal-50 p-3 text-xs text-slate-600">
          <p className="font-semibold text-teal-700">Planned Post</p>
          <p className="mt-1 leading-relaxed">{highlight.plannedPost}</p>
        </div>
      )}
      {highlight.published && (
        <p className="mt-3 text-xs font-semibold uppercase text-emerald-600">
          Published {highlight.publishedAt ? new Date(highlight.publishedAt).toLocaleDateString() : ''}
        </p>
      )}
    </article>
  );
};
