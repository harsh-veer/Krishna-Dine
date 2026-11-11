import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardList } from 'lucide-react';
import WaiterLayout from '../../layouts/WaiterLayout';
import StatusBadge from '../../components/StatusBadge';
import { Spinner, Tabs } from '../../components/ui';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import { formatTime } from '../../utils/format';
import { useNow } from '../../hooks/useNow';

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Served today' },
];

/** Waiter home: live list of orders. Shows items and status only, never money or sales totals. */
export default function WaiterOrdersPage() {
  const [tab, setTab] = useState('active');
  useNow(30000);
  const { orders, connected, loading } = useStaffOrders({ params: { active: true } });

  const { active, done } = useMemo(() => {
    const a = [];
    const d = [];
    orders.forEach((o) => {
      if (o.orderStatus === 'cancelled') return;
      (o.orderStatus === 'served' || o.isClosed ? d : a).push(o);
    });
    a.sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));
    d.sort((x, y) => new Date(y.updatedAt) - new Date(x.updatedAt));
    return { active: a, done: d };
  }, [orders]);

  const list = tab === 'active' ? active : done;
  const tabs = TABS.map((t) => ({ ...t, count: t.value === 'active' ? active.length : done.length }));

  return (
    <WaiterLayout connected={connected}>
      <Tabs tabs={tabs} value={tab} onChange={setTab} size="lg" className="mb-4 w-fit max-w-full" />
      {loading ? (
        <Spinner label="Loading orders" />
      ) : list.length === 0 ? (
        <div className="card flex flex-col items-center p-10 text-center text-brand-900/60">
          <ClipboardList className="mb-2 h-8 w-8" />
          {tab === 'active' ? 'No active orders. Tap New order to take one.' : 'Nothing served yet.'}
        </div>
      ) : (
        <ul className="space-y-3" data-testid="waiter-orders">
          {list.map((o) => (
            <li key={o.id}>
              <Link to={`/waiter/orders/${o.id}`} className="card flex items-center gap-3 p-4 transition hover:shadow-lift" data-testid="waiter-order-row">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-900/50">Table</span>
                  <span className="text-xl font-extrabold leading-none">{o.tableNumber}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-900/60">{o.orderNumber}</span>
                    <StatusBadge status={o.orderStatus} />
                  </div>
                  <p className="mt-1 truncate text-sm text-brand-900/70">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
                  <p className="text-xs text-brand-900/45">{o.customerName} · {formatTime(o.createdAt)}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-brand-900/35" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WaiterLayout>
  );
}
