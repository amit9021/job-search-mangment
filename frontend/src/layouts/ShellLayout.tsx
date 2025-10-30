import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSessionStore } from '../stores/session';
import { NextActionCard } from '../components/NextActionCard';
import { useNextActionQuery } from '../api/hooks';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/growth', label: 'Growth' },
  { to: '/tasks', label: 'Tasks' }
];

export const ShellLayout = () => {
  const clear = useSessionStore((state) => state.clear);
  const user = useSessionStore((state) => state.user);
  const { data: nextAction } = useNextActionQuery();
  const location = useLocation();
  const current = links.find((link) => (link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to)));

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-64 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6">
          <span className="text-lg font-semibold text-slate-900">Job Hunt</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-muted text-brand' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-4 pb-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            Signed in as <strong className="text-slate-700">{user?.username}</strong>
          </div>
          <button
            onClick={clear}
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{current?.label ?? 'Dashboard'}</h1>
            <p className="text-sm text-slate-500">Stay on top of your search momentum.</p>
          </div>
          {nextAction && <NextActionCard action={nextAction} />}
        </header>
        <div className="px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
