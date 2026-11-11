import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Ban, ChefHat, ConciergeBell, HandPlatter, Pencil, ThumbsUp } from 'lucide-react';
import WaiterLayout from '../../layouts/WaiterLayout';
import StatusBadge from '../../components/StatusBadge';
import CancelOrderDialog from '../../components/CancelOrderDialog';
import VegMark from '../../components/VegMark';
import { Button, Spinner } from '../../components/ui';
import { orderApi } from '../../services/endpoints';
import { errorMessage, tokenStore } from '../../services/api';
import { createSocket, ORDER_EVENTS } from '../../services/socket';
import { formatDateTime, STATUS_META } from '../../utils/format';

const NEXT = {
  pending: { status: 'accepted', label: 'Accept', icon: ThumbsUp },
  accepted: { status: 'preparing', label: 'Start preparing', icon: ChefHat },
  preparing: { status: 'ready', label: 'Mark ready', icon: ConciergeBell },
  ready: { status: 'served', label: 'Mark served', icon: HandPlatter },
};

/** One order for a waiter: items, status actions, edit and cancel. No prices or totals are shown. */
export default function WaiterOrderPage() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setO(await orderApi.get(id));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    load();
    const socket = createSocket({ token: tokenStore.get() });
    ORDER_EVENTS.forEach((ev) => socket.on(ev, (p) => { if (p.order?.id === id) setO(p.order); }));
    return () => socket.disconnect();
  }, [id, load]);

  const advance = async (status) => {
    setBusy(true);
    try {
      setO(await orderApi.setStatus(id, status));
      toast.success(`Order ${STATUS_META[status].label.toLowerCase()}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <WaiterLayout><p className="card p-6 text-red-700">{error}</p></WaiterLayout>;
  if (!o) return <WaiterLayout><Spinner /></WaiterLayout>;

  const next = NEXT[o.orderStatus];
  const cancelled = o.orderStatus === 'cancelled';
  const locked = o.isClosed || o.paymentStatus === 'paid';

  return (
    <WaiterLayout>
      <Link to="/waiter" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> All orders</Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">Table {o.tableNumber}</h1>
            <StatusBadge status={o.orderStatus} />
          </div>
          <p className="text-sm text-brand-900/60"><span className="font-mono">{o.orderNumber}</span> · {o.customerName}{o.customerPhone ? ` · ${o.customerPhone}` : ''} · {formatDateTime(o.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {next && !o.isClosed && <Button icon={next.icon} loading={busy} onClick={() => advance(next.status)} data-testid="waiter-advance">{next.label}</Button>}
          {!cancelled && !locked && <Link to={`/waiter/orders/${o.id}/edit`}><Button variant="secondary" icon={Pencil} data-testid="waiter-edit">Edit order</Button></Link>}
          {!cancelled && !locked && o.orderStatus !== 'served' && <Button variant="secondary" className="text-red-600" icon={Ban} onClick={() => setCancelOpen(true)}>Cancel</Button>}
        </div>
      </div>

      {cancelled && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Cancelled: {o.cancellationReason}</div>}
      {locked && !cancelled && <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This order is closed or paid, so it can no longer be edited.</div>}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 font-bold">Items</div>
        <ul className="divide-y divide-cream-200">
          {o.items.map((i, idx) => (
            <li key={`${i.menuItem}-${idx}`} className="flex items-start justify-between gap-3 px-5 py-3">
              <span className="inline-flex items-start gap-2 font-semibold"><VegMark veg={i.isVegetarian} /> <span>{i.name}{i.notes && <span className="block text-xs font-normal text-amber-700">{i.notes}</span>}</span></span>
              <span className="font-bold tabular-nums">× {i.quantity}</span>
            </li>
          ))}
        </ul>
        {o.specialInstructions && <p className="border-t border-cream-200 px-5 py-3 text-sm text-amber-900">Note: {o.specialInstructions}</p>}
      </div>

      <CancelOrderDialog order={cancelOpen ? o : null} onClose={() => setCancelOpen(false)} onCancelled={() => load()} />
    </WaiterLayout>
  );
}
