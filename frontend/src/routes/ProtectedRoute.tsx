import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/useAuth';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Verifying session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
