import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ShoppingBag, StickyNote, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { QtyStepper } from './MenuItemCard';
import VegMark from '../../components/VegMark';
import { Button, Field, Input, Textarea } from '../../components/ui';
import { formatINR, uid } from '../../utils/format';
import { useI18n } from '../../i18n';
import { publicApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import { storage } from '../../services/storage';

const makeSchema = (t) =>
  z.object({
    customerName: z.string().trim().min(1, t('cart.nameRequired')).max(60),
    customerPhone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ''))
      .refine((v) => v === '' || /^(\+91)?[6-9]\d{9}$/.test(v), t('cart.phoneInvalid')),
  });

export default function CartSheet({ open, onClose, table, tableToken, settings, onPlaced }) {
  const cart = useCart();
  const { t, pick } = useI18n();
  const schema = useMemo(() => makeSchema(t), [t]);
  const [submitting, setSubmitting] = useState(false);
  // One idempotency key per checkout attempt: retries and double taps cannot create two orders.
  const keyRef = useRef(uid());
  const saved = storage.get('kd_customer', {});
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { customerName: saved.customerName || '', customerPhone: saved.customerPhone || '' },
  });

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const estimate = useMemo(() => {
    const service = Math.round(cart.subtotal * (settings?.serviceChargeRate || 0)) / 100;
    const gst = Math.round((cart.subtotal + service) * (settings?.gstRate || 0)) / 100;
    return { service, gst, total: Math.round(cart.subtotal + service + gst) };
  }, [cart.subtotal, settings]);

  const hasUnavailable = cart.lines.some((l) => l.unavailable);

  const submit = handleSubmit(async (values) => {
    if (!cart.lines.length) return;
    setSubmitting(true);
    try {
      storage.set('kd_customer', values);
      const res = await publicApi.placeOrder({
        qrToken: tableToken,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        specialInstructions: cart.instructions,
        idempotencyKey: keyRef.current,
        items: cart.lines.map((l) => ({ menuItemId: l.id, quantity: l.quantity, size: l.size || '', addons: l.addons || [], notes: l.notes || '' })),
      });
      keyRef.current = uid();
      cart.clear();
      onPlaced(res);
    } catch (err) {
      const status = err.response?.status;
      // Network failures keep the same key so a retry is safe; a rejected order gets a fresh key.
      if (status && status < 500) keyRef.current = uid();
      toast.error(errorMessage(err, 'Could not place your order. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t('cart.title')}>
      <div className="absolute inset-0 animate-fade-in bg-brand-950/50" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full max-w-lg animate-slide-up flex-col rounded-t-[28px] bg-cream-50 shadow-lift">
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-cream-300" />
        <div className="flex items-center justify-between px-5 pb-3 pt-3">
          <div>
            <h2 className="text-xl font-extrabold text-brand-950">{t('cart.title')}</h2>
            <p className="text-sm text-brand-900/60">{t('common.table', { n: table.tableNumber })}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-cream-200" aria-label={t('common.close')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
            {cart.lines.length === 0 ? (
              <div className="py-12 text-center text-brand-900/60">
                <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-brand-300" />
                {t('cart.empty')}
              </div>
            ) : (
              <div className="card divide-y divide-cream-200">
                {cart.lines.map((l) => (
                  <div key={l.key} className="p-3.5">
                    <div className="flex items-center gap-3">
                      <VegMark veg={l.isVegetarian} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold leading-snug text-brand-950">{pick(l, 'name')}</div>
                        {(l.size || l.addons?.length > 0) && (
                          <div className="text-xs font-medium text-brand-800">{[l.size, ...(l.addons || []).map((a) => `+ ${a}`)].filter(Boolean).join(' · ')}</div>
                        )}
                        <div className="text-sm text-brand-900/60">{t('cart.each', { p: formatINR(l.price) })}</div>
                        {l.unavailable && <div className="text-xs font-semibold text-red-600">{t('cart.unavailableLine')}</div>}
                      </div>
                      <QtyStepper size="sm" value={l.quantity} onChange={(v) => cart.setQuantity(l.key, v)} />
                      <div className="w-16 text-right font-bold tabular-nums">{formatINR(l.price * l.quantity)}</div>
                    </div>
                    <input
                      value={l.notes || ''}
                      onChange={(e) => cart.setNote(l.key, e.target.value)}
                      maxLength={120}
                      placeholder={t('cart.lineNote')}
                      aria-label={`${t('cart.lineNote')}: ${pick(l, 'name')}`}
                      className="mt-2 w-full rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-xs placeholder:text-brand-900/35"
                      data-testid="line-note"
                    />
                  </div>
                ))}
              </div>
            )}

            <Field label={<span className="inline-flex items-center gap-1.5"><StickyNote className="h-4 w-4" /> {t('cart.instructions')}</span>} htmlFor="instructions">
              <Textarea
                id="instructions"
                maxLength={500}
                placeholder={t('cart.instructionsPh')}
                value={cart.instructions}
                onChange={(e) => cart.setInstructions(e.target.value)}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('cart.name')} error={formState.errors.customerName?.message} htmlFor="customerName">
                <Input id="customerName" autoComplete="name" placeholder={t('cart.namePh')} {...register('customerName')} />
              </Field>
              <Field label={t('cart.mobile')} error={formState.errors.customerPhone?.message} htmlFor="customerPhone">
                <Input id="customerPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder={t('cart.mobilePh')} {...register('customerPhone')} />
              </Field>
            </div>

            {cart.lines.length > 0 && (
              <div className="card space-y-1.5 p-4 text-sm">
                <Row label={t('cart.itemTotal')} value={formatINR(cart.subtotal)} />
                {estimate.service > 0 && <Row label={t('cart.service', { p: settings.serviceChargeRate })} value={formatINR(estimate.service)} />}
                <Row label={t('cart.gst', { p: settings?.gstRate ?? 0 })} value={formatINR(estimate.gst)} />
                <div className="my-2 border-t border-dashed border-cream-300" />
                <Row label={<span className="font-bold text-brand-950">{t('cart.estTotal')}</span>} value={<span className="text-base font-extrabold text-brand-950">{formatINR(estimate.total)}</span>} />
                <p className="pt-1 text-xs text-brand-900/50">{t('cart.finalNote')}</p>
              </div>
            )}
          </div>

          <div className="border-t border-cream-200 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <Button type="submit" size="xl" className="w-full" loading={submitting} disabled={!cart.lines.length || hasUnavailable} data-testid="place-order">
              {t('cart.place')} {cart.lines.length > 0 && `· ${formatINR(estimate.total)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-brand-900/75">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
