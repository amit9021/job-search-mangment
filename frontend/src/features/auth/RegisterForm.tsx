import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from './useAuth';

const schema = z
  .object({
    email: z
      .string()
      .min(1, 'Email required')
      .email('Enter a valid email'),
    password: z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string().min(8, 'Minimum 8 characters')
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

export const RegisterForm = () => {
  const { register: registerAccount, registerStatus } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    await registerAccount({ email, password });
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="register-email">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="register-password">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          autoComplete="new-password"
          {...register('password')}
        />
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="register-confirm-password">
          Confirm password
        </label>
        <input
          id="register-confirm-password"
          type="password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          autoComplete="new-password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={registerStatus === 'pending'}
        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50 disabled:cursor-wait disabled:opacity-75"
      >
        {registerStatus === 'pending' ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
};
