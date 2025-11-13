import { useAuth } from '../features/auth/useAuth';

export const UserStatus = () => {
  const { user, logout, logoutStatus } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Error feedback handled by useAuth toast hook; no-op here.
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        {user.email}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={logoutStatus === 'pending'}
        className="text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:cursor-wait"
      >
        {logoutStatus === 'pending' ? 'Signing out…' : 'Log out'}
      </button>
    </div>
  );
};
