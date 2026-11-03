import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { KeyRound, ShieldCheck, Trash2, UserPlus, ChefHat } from 'lucide-react';
import { PageHeader } from '../../layouts/AdminLayout';
import { Badge, Button, ConfirmDialog, Field, Input, Modal, Select, Spinner, Toggle } from '../../components/ui';
import { userApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/format';

const password = z.string().min(8, 'At least 8 characters').max(72).refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use letters and numbers');
const createSchema = z.object({ name: z.string().trim().min(1, 'Name is required'), email: z.string().trim().email('Enter a valid email'), role: z.enum(['admin', 'kitchen']), password });

export default function StaffPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const load = useCallback(() => userApi.list().then(setUsers).catch((e) => toast.error(errorMessage(e))), []);
  useEffect(() => {
    load();
  }, [load]);

  const update = async (u, patch) => {
    try {
      await userApi.update(u.id, patch);
      toast.success('Staff member updated');
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Staff" description="Admins manage everything. Kitchen staff can only use the kitchen display and mark items sold out." actions={<Button icon={UserPlus} onClick={() => setAdding(true)}>Add staff</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="card flex gap-3 p-4 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-brand-700" /><div><strong>Admin:</strong> dashboard, menu, tables and QR codes, orders, billing and payments, reports, staff and settings.</div></div>
        <div className="card flex gap-3 p-4 text-sm"><ChefHat className="h-5 w-5 shrink-0 text-gold-600" /><div><strong>Kitchen:</strong> live order board, accept / prepare / ready / served, cancel with reason, item availability. Enforced on the server.</div></div>
      </div>
      {!users ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-cream-100 text-left text-xs font-bold uppercase tracking-wider text-brand-900/50">
              <tr><th className="px-5 py-3">Name</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Active</th><th className="px-3 py-3">Last login</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {users.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <div className="font-semibold">{u.name} {self && <span className="text-xs text-brand-900/40">(you)</span>}</div>
                      <div className="text-xs text-brand-900/50">{u.email}</div>
                      {u.mustChangePassword && <Badge tone="amber" className="mt-1">Must change password</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <Select value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value })} className="w-32 py-1.5" aria-label="Role">
                        <option value="admin">Admin</option>
                        <option value="kitchen">Kitchen</option>
                      </Select>
                    </td>
                    <td className="px-3 py-3"><Toggle checked={u.isActive} disabled={self} onChange={(v) => update(u, { isActive: v })} label="Active" size="sm" /></td>
                    <td className="px-3 py-3 text-brand-900/60">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="sm" icon={KeyRound} onClick={() => setResetting(u)}>Reset password</Button>
                      {!self && <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={() => setDeleting(u)} aria-label={`Delete ${u.name}`} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {adding && <AddStaffModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
      {resetting && <ResetModal user={resetting} onClose={() => setResetting(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        danger
        title={`Remove ${deleting?.name}?`}
        message="They are signed out everywhere and can no longer log in. To pause access temporarily, switch them to inactive instead."
        confirmLabel="Remove"
        onConfirm={async () => {
          try {
            await userApi.remove(deleting.id);
            setDeleting(null);
            load();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      />
    </>
  );
}

function AddStaffModal({ onClose, onSaved }) {
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(createSchema), defaultValues: { role: 'kitchen' } });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await userApi.create(v);
      toast.success(`${v.name} added. They will set their own password at first login.`);
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });
  return (
    <Modal open onClose={onClose} title="Add staff member" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onSubmit} loading={formState.isSubmitting}>Add</Button></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" error={formState.errors.name?.message}><Input {...register('name')} /></Field>
        <Field label="Email (used to sign in)" error={formState.errors.email?.message}><Input type="email" {...register('email')} /></Field>
        <Field label="Role"><Select {...register('role')}><option value="kitchen">Kitchen staff</option><option value="admin">Admin</option></Select></Field>
        <Field label="Temporary password" error={formState.errors.password?.message} hint="They must change it after the first login"><Input type="text" autoComplete="off" {...register('password')} /></Field>
      </form>
    </Modal>
  );
}

function ResetModal({ user, onClose }) {
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(z.object({ password })) });
  const onSubmit = handleSubmit(async ({ password: pw }) => {
    try {
      await userApi.resetPassword(user.id, pw);
      toast.success('Password reset. They are signed out and must choose a new password.');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });
  return (
    <Modal open onClose={onClose} title={`Reset password for ${user.name}`} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onSubmit} loading={formState.isSubmitting}>Reset</Button></>}>
      <form onSubmit={onSubmit}>
        <Field label="New temporary password" error={formState.errors.password?.message}><Input type="text" autoComplete="off" {...register('password')} /></Field>
      </form>
    </Modal>
  );
}
