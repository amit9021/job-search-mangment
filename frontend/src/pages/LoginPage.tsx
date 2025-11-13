import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { LoginForm } from '../features/auth/LoginForm';
import { RegisterForm } from '../features/auth/RegisterForm';
import { useAuth } from '../features/auth/useAuth';

export const LoginPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Welcome back</p>
            <h1 className="text-2xl font-semibold text-slate-900">Sign in to your workspace</h1>
            <p className="text-sm text-slate-500">
              Use the email and password you registered with. Tokens expire after 7 days of inactivity.
            </p>
          </div>
          <LoginForm />
        </section>
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8">
          <div className="mb-6 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">New here?</p>
            <h2 className="text-xl font-semibold text-slate-900">Create an account</h2>
            <p className="text-sm text-slate-500">
              Passwords are hashed with bcrypt and never stored in plaintext. We&apos;ll add OAuth options soon.
            </p>
          </div>
          <RegisterForm />
        </section>
      </div>
    </div>
  );
};
