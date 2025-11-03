import { format } from 'date-fns';
import type { GrowthReview } from '../../api/hooks';

interface ReviewCardProps {
  review: GrowthReview;
}

export const ReviewCard = ({ review }: ReviewCardProps) => {
  const reviewerName = review.contact?.name ?? 'Unknown reviewer';
  const reviewerRole = review.contact?.role;
  const reviewerCompany = review.contact?.company?.name;

  return (
    <article className="flex h-full flex-col rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Senior Review</p>
          <h3 className="text-base font-semibold text-slate-900">{review.projectName}</h3>
          <p className="text-xs text-slate-500">
            {reviewerName}
            {reviewerRole ? ` · ${reviewerRole}` : ''}
            {reviewerCompany ? ` @ ${reviewerCompany}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{review.score}/5</span>
          <span className="mt-1 text-xs text-slate-500">{format(new Date(review.reviewedAt), 'PP')}</span>
        </div>
      </header>
      <p className="mt-3 text-sm text-slate-700">{review.summary}</p>
      {review.takeaways && (
        <div className="mt-3 rounded-lg bg-white/70 p-3 text-xs text-slate-600">
          <p className="font-medium text-blue-700">Takeaways</p>
          <p className="mt-1 leading-relaxed">{review.takeaways}</p>
        </div>
      )}
    </article>
  );
};
