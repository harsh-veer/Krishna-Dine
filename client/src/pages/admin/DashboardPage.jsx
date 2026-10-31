import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, IndianRupee, ReceiptText, Timer, Wallet } from 'lucide-react';
import { PageHeader } from '../../layouts/AdminLayout';
import StatCard from '../../components/StatCard';
import StatusBadge, { PaymentBadge } from '../../components/StatusBadge';
import { RevenueAreaChart, RevenueBarChart } from '../../components/charts/Charts';
import { Spinner, EmptyState } from '../../components/ui';
import { reportApi } from '../../services/endpoints';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import { formatDate, formatINR, formatTime, todayKey } from '../../utils/format';

const dayLabel = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const load = useCallback(() => reportApi.dashboard().then(setStats).catch(() => {}), []);
  const { orders } = useStaffOrders({ params: { date: todayKey(), limit: 8 }, onEvent: () => load() });

  useEffect(() => {
    load();
  }, [load]);

  const recent = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  const t = stats?.today;

  return (
    <>
      <PageHeader title="Dashboard" description={`Today, ${formatDate(new Date())}. Updates live as orders come in.`} />
      {!stats ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Orders today" value={t.totalOrders} icon={ReceiptText} hint={`${t.cancelledOrders} cancelled`} />
            <StatCard label="Revenue today" value={formatINR(t.revenue)} icon={IndianRupee} tone="gold" hint={`${formatINR(t.collected)} collected`} />
            <StatCard label="Pending orders" value={t.pendingOrders} icon={Clock} tone="amber" hint={`${stats.activeOrders} active in kitchen`} />
            <StatCard label="Completed orders" value={t.completedOrders} icon={CheckCircle2} tone="blue" hint={`Avg. order ${formatINR(t.averageOrderValue)}`} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="card p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Daily sales</h2>
                  <p className="text-xs text-brand-900/50">Last 7 days, excluding cancelled orders</p>
                </div>
                <Link to="/admin/reports" className="text-sm font-semibold text-brand-700 hover:underline">Reports</Link>
              </div>
              <RevenueBarChart data={stats.daily} xFormatter={dayLabel} />
            </div>
            <div className="card p-5">
              <h2 className="font-bold">Best sellers</h2>
              <p className="mb-4 text-xs text-brand-900/50">Last 7 days by quantity</p>
              {stats.bestSellers.length === 0 ? (
                <EmptyState title="No sales yet" message="Best-selling dishes appear here." className="py-6" />
              ) : (
                <ol className="space-y-3">
                  {stats.bestSellers.map((b, i) => {
                    const max = stats.bestSellers[0].quantity || 1;
                    return (
                      <li key={b.menuItemId}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold"><span className="mr-2 text-brand-900/40">{i + 1}</span>{b.name}</span>
                          <span className="tabular-nums text-brand-900/70">{b.quantity} sold</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-200">
                          <div className="h-full rounded-full bg-brand-600" style={{ width: `${(b.quantity / max) * 100}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="card p-5">
              <h2 className="font-bold">Weekly sales</h2>
              <p className="mb-4 text-xs text-brand-900/50">Rolling 7-day totals, last 8 weeks (label = week start)</p>
              <RevenueAreaChart data={stats.weekly} height={220} />
            </div>
            <div className="card overflow-hidden xl:col-span-2">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-bold">Latest orders today</h2>
                <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">All orders <ArrowRight className="h-4 w-4" /></Link>
              </div>
              {recent.length === 0 ? (
                <EmptyState icon={Timer} title="No orders yet today" message="Orders from table QR codes show up here instantly." className="py-8" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-cream-200">
                      {recent.map((o) => (
                        <tr key={o.id} className="hover:bg-cream-50">
                          <td className="px-5 py-3"><Link to={`/admin/orders/${o.id}`} className="font-mono font-bold text-brand-800 hover:underline">{o.orderNumber}</Link></td>
                          <td className="px-3 py-3">Table {o.tableNumber}</td>
                          <td className="px-3 py-3 text-brand-900/60">{formatTime(o.createdAt)}</td>
                          <td className="px-3 py-3"><StatusBadge status={o.orderStatus} /></td>
                          <td className="px-3 py-3"><PaymentBadge status={o.paymentStatus} /></td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatINR(o.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-brand-900/45"><Wallet className="h-3.5 w-3.5" /> Revenue counts every order that was not cancelled. "Collected" counts paid orders only.</p>
        </>
      )}
    </>
  );
}
