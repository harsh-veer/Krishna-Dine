import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, CircleX, Plus, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { publicApi } from '../../services/endpoints';
import { createSocket, ORDER_EVENTS } from '../../services/socket';
import { errorMessage } from '../../services/api';
import { myOrders } from './myOrders';
import Logo from '../../components/Logo';
import OrderProgress from '../../components/OrderProgress';
import StatusBadge from '../../components/StatusBadge';
import VegMark from '../../components/VegMark';
import { Button, EmptyState, FullPageSpinner } from '../../components/ui';
import { formatINR, formatTime, STATUS_META } from '../../utils/format';

const newer = (a, b) => !b || (a.version ?? 0) > (b.version ?? 0) || ((a.version ?? 0) === (b.version ?? 0) && new Date(a.updatedAt) >= new Date(b.updatedAt));

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const justPlaced = params.get('placed') === '1';
  const entry = myOrders.find(orderId);
  const token = entry?.token || params.get('t');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [live, setLive] = useState(false);

  const apply = useCallback((o) => setOrder((prev) => (newer(o, prev) ? o : prev)), []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      apply(await publicApi.order(orderId, token));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [orderId, token, apply]);

  useEffect(() => {
    if (!token) return undefined;
    refresh();
    const socket = createSocket();
    const subscribe = () =>
      socket.emit('track-order', { orderId, token }, (res) => {
        if (res?.ok) {
          setLive(true);
          apply(res.order);
        }
      });
    socket.on('connect', subscribe);
    socket.on('disconnect', () => setLive(false));
    ORDER_EVENTS.forEach((evt) =>
      socket.on(evt, (payload) => {
        if (payload?.order?.id === orderId) apply(payload.order);
      })
    );
    const poll = setInterval(() => {
      if (!socket.connected) refresh();
    }, 15000);
    return () => {
      clearInterval(poll);
      socket.close();
    };
  }, [orderId, token, refresh, apply]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <EmptyState title="Order not found on this device" message="Order tracking is only available on the phone that placed the order." />
      </div>
    );
  }
  if (!order && !error) return <FullPageSpinner label="Loading your order" />;
  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <EmptyState title="Could not load order" message={error} action={<Button onClick={refresh} icon={RefreshCw}>Try again</Button>} />
      </div>
    );
  }

  const cancelled = order.orderStatus === 'cancelled';
  const menuLink = entry?.tableToken ? `/menu/${entry.tableToken}` : null;
  const others = myOrders.all().filter((o) => o.tableToken === entry?.tableToken && o.id !== orderId).slice(0, 5);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-cream-100 pb-10">
      <header className="flex items-center justify-between px-4 py-3">
        {menuLink ? (
          <Link to={menuLink} className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-sm font-semibold text-brand-800 hover:bg-cream-200">
            <ArrowLeft className="h-4 w-4" /> Menu
          </Link>
        ) : (
          <Logo subtitle={false} />
        )}
        <span className={`chip ${live ? 'bg-brand-50 text-brand-700' : 'bg-cream-200 text-brand-900/60'}`} title={live ? 'Live updates on' : 'Reconnecting'}>
          {live ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />} {live ? 'Live' : 'Offline'}
        </span>
      </header>

      <div className="px-4">
        {justPlaced && !cancelled && (
          <div className="card mb-4 animate-pop overflow-hidden" data-testid="order-confirmation">
            <div className="bg-brand-900 px-5 py-6 text-center text-cream-50">
              <CircleCheck className="mx-auto h-12 w-12 text-gold-400" />
              <h1 className="mt-3 text-2xl font-extrabold">Order placed!</h1>
              <p className="mt-1 text-sm text-cream-200/75">The kitchen has received your order.</p>
            </div>
          </div>
        )}

        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-900/50">Order number</div>
              <div className="font-mono text-xl font-extrabold text-brand-950" data-testid="order-number">{order.orderNumber}</div>
              <div className="mt-0.5 text-sm text-brand-900/60">Table {order.tableNumber} · {formatTime(order.createdAt)}</div>
            </div>
            <StatusBadge status={order.orderStatus} className="text-sm" />
          </div>
          <p className="mt-4 rounded-xl bg-cream-100 px-3.5 py-2.5 text-sm font-semibold text-brand-900" data-testid="order-status-text">
            {STATUS_META[order.orderStatus]?.description}
          </p>
          <div className="mt-5">
            {cancelled ? (
              <div className="flex gap-3 rounded-2xl bg-red-50 p-4 text-red-800">
                <CircleX className="h-6 w-6 shrink-0" />
                <div>
                  <div className="font-bold">Order cancelled</div>
                  {order.cancellationReason && <div className="text-sm">Reason: {order.cancellationReason}</div>}
                  <div className="mt-1 text-xs text-red-700/80">Please speak to our staff if you have any questions.</div>
                </div>
              </div>
            ) : (
              <OrderProgress order={order} />
            )}
          </div>
        </div>

        <div className="card mt-4 p-5">
          <h2 className="mb-3 font-bold">Items</h2>
          <ul className="space-y-2.5">
            {order.items.map((i) => (
              <li key={i.menuItem} className="flex items-center gap-2.5 text-sm">
                <VegMark veg={i.isVegetarian} />
                <span className="flex-1"><span className="font-semibold">{i.quantity} ×</span> {i.name}</span>
                <span className="tabular-nums">{formatINR(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {order.specialInstructions && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Note: {order.specialInstructions}</p>}
          <div className="mt-4 space-y-1 border-t border-dashed border-cream-300 pt-3 text-sm text-brand-900/70">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
            {order.serviceCharge > 0 && <div className="flex justify-between"><span>Service charge</span><span>{formatINR(order.serviceCharge)}</span></div>}
            <div className="flex justify-between"><span>GST ({order.gstRate}%)</span><span>{formatINR(order.tax)}</span></div>
            {order.roundOff !== 0 && <div className="flex justify-between"><span>Round off</span><span>{formatINR(order.roundOff)}</span></div>}
            <div className="flex justify-between pt-1 text-base font-extrabold text-brand-950"><span>Total</span><span>{formatINR(order.totalAmount)}</span></div>
            <div className="pt-1 text-xs">
              Payment: {order.paymentStatus === 'paid' ? <span className="font-semibold text-brand-700">Paid</span> : 'Pay at the counter'}
            </div>
          </div>
        </div>

        {menuLink && (
          <Link to={menuLink} className="mt-4 block">
            <Button variant="secondary" size="lg" className="w-full" icon={Plus}>Order something else</Button>
          </Link>
        )}

        {others.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-bold text-brand-900/60">Earlier orders from this table</h3>
            <div className="space-y-2">
              {others.map((o) => (
                <Link key={o.id} to={`/order/${o.id}`} className="card flex items-center justify-between px-4 py-3 text-sm hover:shadow-lift">
                  <span className="font-mono font-bold">{o.orderNumber}</span>
                  <span className="text-brand-900/50">{formatTime(o.createdAt)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
