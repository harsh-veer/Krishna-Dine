import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Save, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../layouts/AdminLayout';
import { Button, Field, Input, Spinner, Textarea, Toggle } from '../../components/ui';
import { paymentApi, settingsApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';

const schema = z.object({
  restaurantName: z.string().trim().min(1).max(100),
  brandName: z.string().trim().min(1).max(60),
  address: z.string().trim().max(250),
  phone: z.string().trim().max(30),
  serviceChargeEnabled: z.boolean(),
  serviceChargeRate: z.coerce.number().min(0).max(20),
  roundTotal: z.boolean(),
  invoiceFooter: z.string().trim().max(200),
  upiId: z.string().trim().max(60).refine((v) => !v || /^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(v), 'Enter a valid UPI ID like krishna@upi'),
});

export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [gateway, setGateway] = useState(null);
  const { register, handleSubmit, reset, control, formState } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    settingsApi.get().then((s) => { reset(s); setLoaded(true); }).catch((e) => toast.error(errorMessage(e)));
    paymentApi.gateway().then(setGateway).catch(() => {});
  }, [reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      reset(await settingsApi.update(v));
      toast.success('Settings saved. New bills use these rates.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  if (!loaded) return <Spinner />;
  const e = formState.errors;
  return (
    <>
      <PageHeader title="Settings" description="Restaurant details and billing rules used on invoices." actions={<Button icon={Save} onClick={onSubmit} loading={formState.isSubmitting} disabled={!formState.isDirty}>Save changes</Button>} />
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-5">
          <h2 className="font-bold">Restaurant</h2>
          <Field label="Legal / invoice name" error={e.restaurantName?.message}><Input {...register('restaurantName')} /></Field>
          <Field label="App name" error={e.brandName?.message}><Input {...register('brandName')} /></Field>
          <Field label="Address"><Textarea {...register('address')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><Input {...register('phone')} /></Field>
          </div>
          <Field label="Invoice footer"><Input {...register('invoiceFooter')} /></Field>
        </div>
        <div className="space-y-6">
          <div className="card space-y-4 p-5">
            <h2 className="font-bold">Billing</h2>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <Field label="Service charge (%)" error={e.serviceChargeRate?.message} hint="Optional. Shown on the bill only when enabled (or applied per bill)."><Input type="number" step="0.01" {...register('serviceChargeRate')} /></Field>
              <Controller name="serviceChargeEnabled" control={control} render={({ field }) => <label className="mb-7 flex items-center gap-2 text-sm font-semibold"><Toggle checked={field.value} onChange={field.onChange} label="Enable service charge" /> On by default</label>} />
            </div>
            <Controller name="roundTotal" control={control} render={({ field }) => <label className="flex items-center gap-2.5 text-sm font-semibold"><Toggle checked={field.value} onChange={field.onChange} label="Round total" /> Round the total to the nearest rupee</label>} />
          </div>
          <div className="card space-y-4 p-5">
            <h2 className="font-bold">Payments</h2>
            <Field label="UPI ID shown at billing" error={e.upiId?.message}><Input {...register('upiId')} placeholder="krishnahotel@sbi" /></Field>
            {gateway && (
              <div className={`flex gap-3 rounded-2xl p-4 text-sm ${gateway.configured ? 'bg-brand-50 text-brand-900' : 'bg-amber-50 text-amber-900'}`}>
                {gateway.configured ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <ShieldAlert className="h-5 w-5 shrink-0" />}
                <div>
                  {gateway.configured ? (
                    <>Payment gateway <strong>{gateway.gateway}</strong> is connected. UPI payments can be verified automatically.</>
                  ) : (
                    <>No payment gateway connected. UPI payments stay <strong>pending</strong> until staff confirm the money arrived. To verify automatically, set <code>PAYMENT_GATEWAY=razorpay</code> with your Razorpay keys on the server (see README).</>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </>
  );
}
