import { differenceInCalendarDays, formatDistanceToNowStrict } from 'date-fns';

type EngagementLevel = 'cold' | 'warm' | 'hot';

type EngagementMeta = {
  level?: EngagementLevel | string | null;
  score?: number | null;
  updatedAt?: string | null;
  reason?: string | null;
};

export type ContactEngagementBadgeProps = {
  lastTouchAt?: string | null;
  nextFollowUpAt?: string | null;
  strength?: string | null;
  engagement?: EngagementMeta | null;
  className?: string;
};

const variantStyles: Record<
  EngagementLevel,
  { label: string; badge: string; dot: string; tone: string }
> = {
  cold: {
    label: 'Cold',
    badge: 'border border-slate-200 bg-slate-100 text-slate-700',
    dot: 'bg-slate-400',
    tone: 'text-slate-500'
  },
  warm: {
    label: 'Warm',
    badge: 'border border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    tone: 'text-amber-500'
  },
  hot: {
    label: 'Hot',
    badge: 'border border-rose-200 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
    tone: 'text-rose-500'
  }
};

const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const computeEngagement = ({
  engagement,
  lastTouchAt,
  nextFollowUpAt,
  strength
}: Omit<ContactEngagementBadgeProps, 'className'>) => {
  const now = new Date();
  const lastTouch = parseDate(lastTouchAt ?? engagement?.updatedAt ?? null);
  const nextFollowUp = parseDate(nextFollowUpAt);

  const normalizedLevel = engagement?.level
    ? (engagement.level.toString().toLowerCase() as EngagementLevel)
    : undefined;

  let score = engagement?.score ?? null;

  if (score === null) {
    let computedScore = 0;
    if (lastTouch) {
      const daysAgo = Math.max(0, differenceInCalendarDays(now, lastTouch));
      if (daysAgo <= 2) {
        computedScore = 90;
      } else if (daysAgo <= 7) {
        computedScore = 75;
      } else if (daysAgo <= 21) {
        computedScore = 55;
      } else {
        computedScore = 20;
      }
    }

    if (nextFollowUp) {
      const daysUntil = differenceInCalendarDays(nextFollowUp, now);
      if (daysUntil <= 0) {
        computedScore = Math.max(computedScore, 85);
      } else if (daysUntil <= 3) {
        computedScore = Math.max(computedScore, 65);
      }
    }

    if (strength === 'STRONG') {
      computedScore = Math.max(computedScore, 65);
    } else if (strength === 'MEDIUM') {
      computedScore = Math.max(computedScore, 45);
    }

    score = computedScore;
  }

  const level: EngagementLevel =
    normalizedLevel ??
    (score !== null && score >= 75
      ? 'hot'
      : score !== null && score >= 45
      ? 'warm'
      : 'cold');

  const descriptors: string[] = [];

  if (engagement?.reason) {
    descriptors.push(engagement.reason);
  } else {
    if (lastTouch) {
      descriptors.push(`Last touch ${formatDistanceToNowStrict(lastTouch, { addSuffix: true })}`);
    } else {
      descriptors.push('No outreach yet');
    }

    if (nextFollowUp) {
      const daysUntil = differenceInCalendarDays(nextFollowUp, now);
      if (daysUntil < 0) {
        descriptors.push('Follow-up overdue');
      } else if (daysUntil <= 2) {
        descriptors.push(`Follow-up due in ${daysUntil === 0 ? '0 days' : `${daysUntil} day${daysUntil === 1 ? '' : 's'}`}`);
      }
    }
  }

  return {
    level,
    score,
    description: descriptors.join(' • ')
  };
};

export const ContactEngagementBadge = ({
  engagement,
  lastTouchAt,
  nextFollowUpAt,
  strength,
  className
}: ContactEngagementBadgeProps) => {
  const computed = computeEngagement({ engagement, lastTouchAt, nextFollowUpAt, strength });
  const variant = variantStyles[computed.level];
  const label = variant.label;
  const ariaLabelParts = [label, 'engagement'];
  if (computed.score !== null) {
    ariaLabelParts.push(`score ${Math.round(computed.score)}`);
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-300 ${variant.badge} ${className ?? ''}`}
      title={computed.description}
      aria-label={ariaLabelParts.join(' ')}
    >
      <span className={`h-2 w-2 rounded-full ${variant.dot}`} aria-hidden />
      <span>{label}</span>
      {computed.score !== null && (
        <span className={`text-[11px] font-semibold ${variant.tone}`}>
          {Math.round(computed.score)}
        </span>
      )}
    </span>
  );
};
