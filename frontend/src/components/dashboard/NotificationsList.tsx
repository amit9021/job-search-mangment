import { Link } from 'react-router-dom';
import type { DashboardSummary } from '../../api/dashboard';

type NotificationsListProps = {
  notifications?: DashboardSummary['notifications'];
  loading?: boolean;
};

const severityStyles: Record<string, string> = {
  high: 'bg-rose-100 text-rose-600',
  med: 'bg-amber-100 text-amber-600',
  low: 'bg-slate-100 text-slate-500'
};

const SkeletonNotification = () => (
  <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white/80 p-3">
    <div className="h-2 w-2 rounded-full bg-slate-200" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
    </div>
  </li>
);

export const NotificationsList = ({ notifications, loading }: NotificationsListProps) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Notifications</h3>
        <ul className="mt-3 space-y-2">
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
        </ul>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <h3 className="text-base font-semibold text-slate-700">No nudges for now</h3>
        <p className="mt-2">Enjoy the calm. Keep logging activity to get timely reminders and momentum tips.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Notifications</h3>
      <ul className="mt-3 space-y-3">
        {notifications.map((notification, index) => {
          const badgeStyle = severityStyles[notification.severity] ?? severityStyles.low;
          return (
            <li key={`${notification.text}-${index}`} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className={`mt-1 inline-flex h-2 w-2 rounded-full ${
                  notification.severity === 'high'
                    ? 'bg-rose-500'
                    : notification.severity === 'med'
                    ? 'bg-amber-500'
                    : 'bg-slate-300'
                }`}>
                  &nbsp;
                </span>
                <div>
                  <p className="text-sm text-slate-700">{notification.text}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeStyle}`}>
                  {notification.severity === 'high'
                    ? 'High'
                    : notification.severity === 'med'
                    ? 'Medium'
                    : 'Low'}
                </span>
                {notification.ctaLink && (
                  <Link
                    to={notification.ctaLink}
                    className="text-xs font-semibold text-brand underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
