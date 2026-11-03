import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { homeFor, useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import Logo from '../../components/Logo';
import { Button, Field, Input } from '../../components/ui';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { login, user, mustChangePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema) });

  if (user) return <Navigate to={mustChangePassword ? '/change-password' : location.state?.from || homeFor(user)} replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError('');
    try {
      const data = await login(email, password);
      navigate(data.mustChangePassword ? '/change-password' : location.state?.from || homeFor(data.user), { replace: true });
    } catch (err) {
      setServerError(errorMessage(err));
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-900 p-12 text-cream-50 lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-800" />
        <div className="absolute -bottom-40 left-10 h-96 w-96 rounded-full bg-brand-700/40" />
        <Logo light className="relative" />
        <div className="relative mt-auto max-w-md">
          <h1 className="font-display text-5xl font-semibold leading-tight">Every table, every order, <span className="text-gold-400">in real time.</span></h1>
          <p className="mt-4 text-cream-200/75">Kitchen display, billing and reports for Krishna Hotel &amp; Restaurant, Akbarpur.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm" noValidate>
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-extrabold text-brand-950">Staff sign in</h2>
          <p className="mt-1 text-sm text-brand-900/60">Admins and kitchen staff use the same login.</p>
          {serverError && <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{serverError}</div>}
          <div className="mt-6 space-y-4">
            <Field label="Email" error={formState.errors.email?.message} htmlFor="email">
              <Input id="email" type="email" autoComplete="username" placeholder="you@krishnadine.local" {...register('email')} />
            </Field>
            <Field label="Password" error={formState.errors.password?.message} htmlFor="password">
              <div className="relative">
                <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="pr-11" {...register('password')} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-brand-900/50" aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full" loading={formState.isSubmitting} icon={Lock}>Sign in</Button>
        </form>
      </div>
    </div>
  );
}
