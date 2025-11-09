import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLoginMutation } from '../api/hooks';

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required')
});

type FormValues = z.infer<typeof schema>;

export const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });
  const loginMutation = useLoginMutation();

  const onSubmit = handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values);
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500">Enter the admin password defined in your .env file.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Username</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              {...register('username')}
            />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              {...register('password')}
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>
        </div>
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600 disabled:cursor-wait disabled:opacity-75"
        >
          {loginMutation.isPending ? 'Authenticating…' : 'Sign in'}
        </button>
        {loginMutation.isError && (
          <p className="text-sm text-red-500">Login failed. Check credentials and try again.</p>
        )}
      </form>
    </div>
  );
};
