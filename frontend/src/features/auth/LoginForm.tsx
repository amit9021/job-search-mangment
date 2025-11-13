import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from './useAuth';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Email required')
    .email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters')
});

type FormValues = z.infer<typeof schema>;

export const LoginForm = () => {
  const { login, loginStatus } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = handleSubmit(async (values) => {
    await login(values);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
      </div>
      <button
        type="submit"
        disabled={loginStatus === 'pending'}
        className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 disabled:cursor-wait disabled:opacity-75"
      >
        {loginStatus === 'pending' ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
};
