import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Ban, Banknote, CheckCircle2, ChefHat, ConciergeBell, HandPlatter, Lock, MessageSquareText, Pencil, Printer, ReceiptText, RefreshCw, Smartphone, ThumbsUp, Trash2, TriangleAlert } from 'lucide-react';
import { orderApi, paymentApi } from '../../services/endpoints';
import { errorMessage, tokenStore } from '../../services/api';
import { createSocket, ORDER_EVENTS } from '../../services/socket';
import StatusBadge, { PaymentBadge } from '../../components/StatusBadge';
import CancelOrderDialog from '../../components/CancelOrderDialog';
import VegMark from '../../components/VegMark';
import { Badge, Button, ConfirmDialog, Field, Input, Spinner, Toggle } from '../../components/ui';
import { formatDateTime, formatINR2, formatTime, PAYMENT_LABEL, STATUS_META } from '../../utils/format';

const NEXT = {
  pending: { status: 'accepted', label: 'Accept', icon: ThumbsUp },
  accepted: { status: 'preparing', label: 'Start preparing', icon: ChefHat },
  preparing: { status: 'ready', label: 'Mark ready', icon: ConciergeBell },
  ready: { status: 'served', label: 'Mark served', icon: HandPlatter },
};

const METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'upi', label: 'UPI', icon: Smartphone },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [serviceCharge, setServiceCharge] = useState(false);

  const load = useCallback(async () => {
    try {
      const b = await orderApi.bill(id);
      setBill(b);
      setServiceCharge(b.order.serviceChargeRate > 0);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    load();
    const socket = createSocket({ token: tokenStore.get() });
    ORDER_EVENTS.forEach((e) => socket.on(e, (p) => p?.order?.id === id && load()));
    return () => socket.close();
  }, [id, load]);

  const run = async (key, fn, success) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.order && res?.restaurant) setBill(res);
      else if (res?.bill) setBill(res.bill);
      else await load();
      if (success) toast.success(success);
      return res;
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    } finally {
      setBusy('');
    }
  };

  if (error && !bill) return <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>;
  if (!bill) return <Spinner />;

  const o = bill.order;
  const next = NEXT[o.orderStatus];
  const cancelled = o.orderStatus === 'cancelled';
  const paid = o.paymentStatus === 'paid';
  const paidRecord = bill.payments.find((p) => p.paymentStatus === 'paid');
  const canBill = !cancelled;

  return (
    <>
      <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-extrabold text-brand-950 sm:text-3xl" data-testid="detail-order-number">{o.orderNumber}</h1>
            <StatusBadge status={o.orderStatus} />
            <PaymentBadge status={o.paymentStatus} />
            {o.isClosed && <Badge tone="dark" icon={Lock}>Closed</Badge>}
          </div>
          <p className="mt-1 text-sm text-brand-900/60">
            Table <strong>{o.tableNumber}</strong> · {o.customerName}{o.customerPhone ? ` · ${o.customerPhone}` : ''} · {formatDateTime(o.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {next && !o.isClosed && (
            <Button icon={next.icon} loading={busy === 'status'} onClick={() => run('status', () => orderApi.setStatus(o.id, next.status), `Order ${STATUS_META[next.status].label.toLowerCase()}`)} data-testid="detail-advance">
              {next.label}
            </Button>
          )}
          {!cancelled && !o.isClosed && !paid && (
            <Link to={`/admin/orders/${o.id}/edit`}><Button variant="secondary" icon={Pencil} data-testid="edit-order">Edit order</Button></Link>
          )}
          {(o.isClosed || cancelled) && (
            <Button variant="secondary" className="text-red-600" icon={Trash2} onClick={() => setDeleteOpen(true)} data-testid="delete-order">Delete order</Button>
          )}
          {!cancelled && !o.isClosed && !paid && o.orderStatus !== 'served' && (
            <Button variant="secondary" className="text-red-600" icon={Ban} onClick={() => setCancelOpen(true)}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 font-bold">Items</div>
            <table className="w-full text-sm">
              <thead className="bg-cream-100 text-left text-xs font-bold uppercase tracking-wider text-brand-900/50">
                <tr><th className="px-5 py-2.5">Item</th><th className="px-3 py-2.5 text-right">Price</th><th className="px-3 py-2.5 text-right">Qty</th><th className="px-5 py-2.5 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {o.items.map((i) => (
                  <tr key={i.menuItem}>
                    <td className="px-5 py-3"><span className="inline-flex items-center gap-2 font-semibold"><VegMark veg={i.isVegetarian} /> {i.name}</span>{i.notes && <div className="text-xs text-amber-700">{i.notes}</div>}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatINR2(i.price)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{i.quantity}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatINR2(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {o.feedback && (
              <div className="mt-3 rounded-xl bg-gold-400/15 px-3 py-2 text-sm" data-testid="order-feedback">
                <span className="font-bold">Customer rating: {'★'.repeat(o.feedback.rating)}{'☆'.repeat(5 - o.feedback.rating)}</span>
                {o.feedback.comment && <span className="block text-brand-900/75">“{o.feedback.comment}”</span>}
              </div>
            )}
            {o.specialInstructions && (
              <div className="m-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <MessageSquareText className="h-4 w-4 shrink-0" /> {o.specialInstructions}
              </div>
            )}
            {cancelled && <div className="m-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Cancelled: {o.cancellationReason}</div>}
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-bold">Timeline</h2>
            <ol className="space-y-3">
              {o.statusHistory.map((h, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm">
                  <StatusBadge status={h.status} />
                  <span className="text-brand-900/70">{formatTime(h.at)}</span>
                  <span className="text-brand-900/50">{h.byName}</span>
                  {h.note && <span className="text-brand-900/50">· {h.note}</span>}
                </li>
              ))}
              {o.paidAt && <li className="flex items-center gap-3 text-sm"><Badge tone="green">Paid</Badge><span className="text-brand-900/70">{formatTime(o.paidAt)}</span></li>}
              {o.closedAt && <li className="flex items-center gap-3 text-sm"><Badge tone="dark">Closed</Badge><span className="text-brand-900/70">{formatTime(o.closedAt)}</span></li>}
            </ol>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5" data-testid="bill-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Bill</h2>
              {o.invoiceNumber && <span className="font-mono text-xs font-bold text-brand-900/60" data-testid="invoice-number">{o.invoiceNumber}</span>}
            </div>
            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatINR2(o.subtotal)} />
              {o.serviceCharge > 0 && <Row label={`Service charge (${o.serviceChargeRate}%)`} value={formatINR2(o.serviceCharge)} />}
              {o.tax > 0 && <Row label={`GST (${o.gstRate}%)`} value={formatINR2(o.tax)} />}
              {o.roundOff !== 0 && <Row label="Round off" value={formatINR2(o.roundOff)} />}
              <div className="flex items-center justify-between border-t border-dashed border-cream-300 pt-2 text-lg font-extrabold">
                <span>Total</span><span className="tabular-nums" data-testid="bill-total">{formatINR2(o.totalAmount)}</span>
              </div>
            </dl>

            {canBill && !paid && !o.isClosed && (
              <div className="mt-4 space-y-3 rounded-2xl bg-cream-100 p-3.5">
                <label className="flex items-center justify-between gap-3 text-sm font-semibold">
                  Apply service charge (rate set in Settings)
                  <Toggle checked={serviceCharge} onChange={setServiceCharge} label="Service charge" size="sm" />
                </label>
                <Button className="w-full" variant={o.invoiceNumber ? 'secondary' : 'primary'} icon={o.invoiceNumber ? RefreshCw : ReceiptText} loading={busy === 'bill'} onClick={() => run('bill', () => orderApi.generateBill(o.id, { applyServiceCharge: serviceCharge }), 'Bill generated')} data-testid="generate-bill">
                  {o.invoiceNumber ? 'Update bill' : 'Generate bill'}
                </Button>
              </div>
            )}
            {o.invoiceNumber && (
              <Link to={`/admin/orders/${o.id}/invoice`} target="_blank" className="mt-3 block">
                <Button variant="secondary" className="w-full" icon={Printer} data-testid="print-invoice">Print invoice</Button>
              </Link>
            )}
          </div>

          {canBill && (
            <div className="card p-5">
              <h2 className="mb-4 font-bold">Payment</h2>
              {paid ? (
                <div className="rounded-2xl bg-brand-50 p-4 text-sm" data-testid="payment-paid">
                  <div className="flex items-center gap-2 font-bold text-brand-800"><CheckCircle2 className="h-5 w-5" /> Paid by {PAYMENT_LABEL[o.paymentMethod]}</div>
                  {paidRecord && (
                    <div className="mt-2 space-y-0.5 text-brand-900/70">
                      <div>{paidRecord.verification === 'gateway' ? 'Verified by payment gateway' : 'Confirmed by staff (not verified by a payment gateway)'}{paidRecord.recordedByName ? ` · ${paidRecord.recordedByName}` : ''}</div>
                      <div>{formatDateTime(paidRecord.confirmedAt || paidRecord.createdAt)}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMethod(m.value)}
                        className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-sm font-bold transition ${method === m.value ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-cream-300 bg-white text-brand-900/70 hover:border-cream-400'}`}
                        data-testid={`method-${m.value}`}
                      >
                        <m.icon className="h-5 w-5" /> {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-brand-900/55">
                    {`Records ${formatINR2(o.totalAmount)} received by ${PAYMENT_LABEL[method].toLowerCase()} and marks the bill paid. Then close the order.`}
                  </p>
                  <Button className="w-full" size="lg" loading={busy === 'pay'} onClick={() => run('pay', () => orderApi.pay(o.id, { paymentMethod: method, transactionReference: reference.trim() }), 'Payment recorded')} data-testid="record-payment">
                    {`Mark paid · ${formatINR2(o.totalAmount)}`}
                  </Button>
                </div>
              )}

              {!o.isClosed && (
                <div className="mt-4 border-t border-cream-200 pt-4">
                  <Button
                    variant="secondary"
                    className="w-full"
                    icon={Lock}
                    disabled={!(paid && o.orderStatus === 'served')}
                    loading={busy === 'close'}
                    onClick={() => run('close', () => orderApi.close(o.id), 'Order closed, table released')}
                    data-testid="close-order"
                  >
                    Close order
                  </Button>
                  {!(paid && o.orderStatus === 'served') && <p className="mt-1.5 text-center text-xs text-brand-900/50">Available once the order is served and paid.</p>}
                </div>
              )}
            </div>
          )}
          {cancelled && !o.isClosed && (
            <Button variant="secondary" className="w-full" icon={Lock} loading={busy === 'close'} onClick={() => run('close', () => orderApi.close(o.id), 'Order closed')}>Close cancelled order</Button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        danger
        title={`Delete order ${o.orderNumber}?`}
        message="This permanently removes the order, its bill and payment records. Reports and totals will no longer include it. This cannot be undone."
        confirmLabel="Delete permanently"
        loading={busy === 'delete'}
        onConfirm={async () => {
          const res = await run('delete', () => orderApi.remove(o.id));
          if (res) {
            toast.success(`Order ${o.orderNumber} deleted`);
            navigate('/admin/orders', { replace: true });
          }
        }}
      />
      <CancelOrderDialog order={cancelOpen ? o : null} onClose={() => setCancelOpen(false)} onCancelled={() => load()} />
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-brand-900/75">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
