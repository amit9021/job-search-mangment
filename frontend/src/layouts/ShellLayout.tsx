import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { NextActionCard } from '../components/NextActionCard';
import { useNextActionQuery } from '../api/hooks';
import { UserStatus } from '../components/UserStatus';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/growth', label: 'Grow' },
  { to: '/tasks', label: 'Tasks' }
];

export const ShellLayout = () => {
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
        <div className="mt-auto px-4 pb-6 text-xs text-slate-500">
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            Tokens refresh when you log in. Log out anytime from the header chip.
          </p>
        </div>
      </aside>
      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{current?.label ?? 'Dashboard'}</h1>
            <p className="text-sm text-slate-500">Stay on top of your search momentum.</p>
          </div>
          <div className="flex items-center gap-6">
            {nextAction && <NextActionCard action={nextAction} />}
            <UserStatus />
          </div>
        </header>
        <div className="px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
