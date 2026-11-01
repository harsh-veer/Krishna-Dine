import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { homeFor, useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import Logo from '../../components/Logo';
import { Button, Field, Input } from '../../components/ui';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .max(72)
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use letters and numbers'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: 'Choose a new password', path: ['newPassword'] });

export default function ChangePasswordPage() {
  const { user, mustChangePassword, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState, setError } = useForm({ resolver: zodResolver(schema) });
  if (!user) return <Navigate to="/login" replace />;

  const onSubmit = handleSubmit(async (v) => {
    try {
      const data = await changePassword(v.currentPassword, v.newPassword);
      toast.success('Password updated');
      navigate(homeFor(data.user), { replace: true });
    } catch (err) {
      setError('currentPassword', { message: errorMessage(err) });
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <form onSubmit={onSubmit} className="card w-full max-w-md p-7" noValidate>
        <Logo className="mb-6" />
        {mustChangePassword ? (
          <div className="mb-5 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <div><strong>Set your own password.</strong> This account still uses its initial password, which must be changed before you continue.</div>
          </div>
        ) : (
          <h2 className="mb-5 text-xl font-extrabold">Change password</h2>
        )}
        <div className="space-y-4">
          <Field label="Current password" error={formState.errors.currentPassword?.message} htmlFor="cp">
            <Input id="cp" type="password" autoComplete="current-password" {...register('currentPassword')} />
          </Field>
          <Field label="New password" error={formState.errors.newPassword?.message} hint="At least 8 characters with letters and numbers" htmlFor="np">
            <Input id="np" type="password" autoComplete="new-password" {...register('newPassword')} />
          </Field>
          <Field label="Confirm new password" error={formState.errors.confirm?.message} htmlFor="cf">
            <Input id="cf" type="password" autoComplete="new-password" {...register('confirm')} />
          </Field>
        </div>
        <div className="mt-6 flex gap-2">
          <Button type="submit" size="lg" className="flex-1" loading={formState.isSubmitting} icon={KeyRound}>Update password</Button>
          {mustChangePassword ? (
            <Button variant="secondary" size="lg" onClick={() => logout().then(() => navigate('/login'))}>Sign out</Button>
          ) : (
            <Button variant="secondary" size="lg" onClick={() => navigate(-1)}>Cancel</Button>
          )}
        </div>
      </form>
    </div>
  );
}
