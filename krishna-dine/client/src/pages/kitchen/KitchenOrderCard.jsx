import { memo } from 'react';
import { Ban, ChefHat, CircleCheck, Clock, ConciergeBell, HandPlatter, MessageSquareText, ThumbsUp, User } from 'lucide-react';
import { Button } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import { elapsed, formatTime, minutesSince } from '../../utils/format';

const NEXT = {
  pending: { status: 'accepted', label: 'Accept order', icon: ThumbsUp, variant: 'gold' },
  accepted: { status: 'preparing', label: 'Start preparing', icon: ChefHat, variant: 'primary' },
  preparing: { status: 'ready', label: 'Mark ready', icon: ConciergeBell, variant: 'success' },
  ready: { status: 'served', label: 'Mark served', icon: HandPlatter, variant: 'primary' },
};

function timerTone(mins, status) {
  if (['served', 'cancelled'].includes(status)) return 'bg-slate-100 text-slate-600';
  if (mins >= 25) return 'bg-red-600 text-white';
  if (mins >= 15) return 'bg-amber-400 text-brand-950';
  return 'bg-brand-50 text-brand-800';
}

function KitchenOrderCard({ order, now, isNew, busy, onAdvance, onCancel }) {
  const next = NEXT[order.orderStatus];
  const started = order.statusHistory?.find((h) => h.status === 'preparing')?.at;
  const timerFrom = order.orderStatus === 'preparing' && started ? started : order.createdAt;
  const mins = minutesSince(order.createdAt, now);
  const finished = ['served', 'cancelled'].includes(order.orderStatus);
  const finishedAt = finished ? order.statusHistory?.at(-1)?.at : null;
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-3xl border-2 bg-white shadow-soft transition ${
        isNew ? 'animate-pulse-ring border-gold-400' : order.orderStatus === 'ready' ? 'border-brand-500' : 'border-transparent'
      }`}
      data-testid="kds-order"
      data-order-number={order.orderNumber}
    >
      <div className={`flex items-start justify-between gap-3 px-5 py-4 ${isNew ? 'bg-gold-400/20' : 'bg-cream-100'}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-extrabold text-brand-950">#{order.orderNumber.split('-').pop()}</span>
            {isNew && <span className="rounded-md bg-gold-400 px-2 py-0.5 text-xs font-extrabold uppercase text-brand-950">New</span>}
            <StatusBadge status={order.orderStatus} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-900/60">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(order.createdAt)}</span>
            <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {order.customerName}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="rounded-2xl bg-brand-900 px-3.5 py-1.5 text-center text-cream-50">
            <div className="text-[10px] font-bold uppercase tracking-widest text-cream-200/70">Table</div>
            <div className="text-2xl font-extrabold leading-none" data-testid="kds-table">{order.tableNumber}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-cream-200 px-5 py-2 text-sm">
        <span className="font-semibold text-brand-900/60">{totalQty} item{totalQty > 1 ? 's' : ''}</span>
        {finished ? (
          <span className="text-brand-900/50">{order.orderStatus === 'served' ? 'Served' : 'Cancelled'} {finishedAt ? formatTime(finishedAt) : ''}</span>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-sm font-bold tabular-nums ${timerTone(mins, order.orderStatus)}`} title={order.orderStatus === 'preparing' ? 'Time since cooking started' : 'Time since order was placed'}>
            <Clock className="h-3.5 w-3.5" /> {elapsed(timerFrom, now)}
          </span>
        )}
      </div>

      <ul className="flex-1 space-y-2 px-5 py-4">
        {order.items.map((i) => (
          <li key={i.menuItem} className="flex items-start gap-3">
            <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-brand-900 px-1.5 text-lg font-extrabold text-cream-50">{i.quantity}</span>
            <div className="pt-0.5">
              <div className="text-lg font-bold leading-tight text-brand-950">{i.name}</div>
              {i.notes && <div className="text-sm font-semibold text-amber-700">{i.notes}</div>}
            </div>
          </li>
        ))}
      </ul>

      {order.specialInstructions && (
        <div className="mx-4 mb-4 flex gap-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-950" data-testid="kds-instructions">
          <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">Special instructions</div>
            <div className="text-base font-bold leading-snug">{order.specialInstructions}</div>
          </div>
        </div>
      )}

      {order.orderStatus === 'cancelled' && order.cancellationReason && (
        <div className="mx-4 mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Cancelled: {order.cancellationReason}</div>
      )}

      {!finished && (
        <div className="flex gap-2 border-t border-cream-200 p-3">
          {next && (
            <Button variant={next.variant} size="xl" className="flex-1" icon={next.icon} loading={busy === next.status} disabled={Boolean(busy)} onClick={() => onAdvance(order, next.status)}>
              {next.label}
            </Button>
          )}
          <Button variant="secondary" size="xl" className="px-4 text-red-600" title="Cancel order" aria-label="Cancel order" disabled={Boolean(busy)} onClick={() => onCancel(order)}>
            <Ban className="h-5 w-5" />
          </Button>
        </div>
      )}
      {order.orderStatus === 'served' && (
        <div className="flex items-center gap-2 border-t border-cream-200 px-5 py-3 text-sm font-semibold text-brand-700">
          <CircleCheck className="h-4 w-4" /> Completed{order.paymentStatus === 'paid' ? ' · Paid' : ''}
        </div>
      )}
    </article>
  );
}

export default memo(KitchenOrderCard);
