import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileDown, IndianRupee, Percent, ReceiptText, Wallet } from 'lucide-react';
import { PageHeader } from '../../layouts/AdminLayout';
import StatCard from '../../components/StatCard';
import { RevenueBarChart } from '../../components/charts/Charts';
import { Button, Input, Spinner, Tabs, EmptyState } from '../../components/ui';
import { reportApi } from '../../services/endpoints';
import { downloadFile, errorMessage } from '../../services/api';
import { formatINR, todayKey, PAYMENT_LABEL } from '../../utils/format';

const dayShort = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function ReportsPage() {
  const [type, setType] = useState('daily');
  const [date, setDate] = useState(todayKey());
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [report, setReport] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setReport(null);
    const p = type === 'daily' ? reportApi.daily(date) : type === 'weekly' ? reportApi.weekly(date) : reportApi.monthly(month);
    p.then(setReport).catch((e) => toast.error(errorMessage(e)));
  }, [type, date, month]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = type === 'daily' ? { date } : type === 'weekly' ? { end: date } : { month };
      await downloadFile(`/reports/${type}`, `krishna-dine-${type}-${type === 'monthly' ? month : date}.csv`, { ...params, format: 'csv' });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const s = report?.summary;
  const chartData = report ? (type === 'daily' ? report.hourly.filter((h) => h.hour >= 6 || h.orders > 0) : report.daily) : [];

  return (
    <>
      <PageHeader title="Reports" description="Sales, orders and popular dishes. Amounts include GST; cancelled orders are excluded from sales." actions={<Button icon={FileDown} onClick={exportCsv} loading={exporting} disabled={!report} data-testid="export-csv">Export CSV</Button>} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs value={type} onChange={setType} tabs={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />
        {type === 'monthly' ? (
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" aria-label="Month" />
        ) : (
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-900/70">
            {type === 'weekly' ? 'Week ending' : 'Date'}
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          </label>
        )}
        {report && <span className="text-sm text-brand-900/50">{report.period.label}</span>}
      </div>

      {!report ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Total orders" value={s.totalOrders} icon={ReceiptText} hint={`${s.completedOrders} served · ${s.cancelledOrders} cancelled`} />
            <StatCard label="Gross sales" value={formatINR(s.revenue)} icon={IndianRupee} tone="gold" hint={`Avg. ${formatINR(s.averageOrderValue)} per order`} />
            <StatCard label="GST" value={formatINR(s.tax)} icon={Percent} tone="blue" hint={`Service charge ${formatINR(s.serviceCharge)}`} />
            <StatCard label="Collected" value={formatINR(s.collected)} icon={Wallet} tone="green" hint={`${formatINR(s.outstanding)} outstanding`} />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="card p-5 xl:col-span-2">
              <h2 className="font-bold">{type === 'daily' ? 'Sales by hour' : 'Sales by day'}</h2>
              <p className="mb-4 text-xs text-brand-900/50">Hover a bar for details</p>
              <RevenueBarChart data={chartData} xKey={type === 'daily' ? 'label' : 'date'} xFormatter={type === 'daily' ? undefined : dayShort} />
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-bold">Payments collected</h2>
              <ul className="space-y-3">
                {report.paymentMethods.map((m) => (
                  <li key={m.method} className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{PAYMENT_LABEL[m.method]}</span>
                    <span className="tabular-nums text-brand-900/70">{m.orders} · <span className="font-bold text-brand-950">{formatINR(m.amount)}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="card mt-6 overflow-x-auto">
            <div className="px-5 py-4 font-bold">Popular menu items</div>
            {report.topItems.length === 0 ? (
              <EmptyState title="No items sold in this period" className="py-8" />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-left text-xs font-bold uppercase tracking-wider text-brand-900/50">
                  <tr><th className="px-5 py-2.5">#</th><th className="px-3 py-2.5">Item</th><th className="px-3 py-2.5 text-right">Quantity</th><th className="px-5 py-2.5 text-right">Sales (before tax)</th></tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {report.topItems.map((t, i) => (
                    <tr key={t.menuItemId}><td className="px-5 py-2.5 text-brand-900/50">{i + 1}</td><td className="px-3 py-2.5 font-semibold">{t.name}</td><td className="px-3 py-2.5 text-right tabular-nums">{t.quantity}</td><td className="px-5 py-2.5 text-right tabular-nums">{formatINR(t.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {type !== 'daily' && (
            <div className="card mt-6 overflow-x-auto">
              <div className="px-5 py-4 font-bold">Day by day</div>
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-left text-xs font-bold uppercase tracking-wider text-brand-900/50">
                  <tr><th className="px-5 py-2.5">Date</th><th className="px-3 py-2.5 text-right">Orders</th><th className="px-3 py-2.5 text-right">Cancelled</th><th className="px-3 py-2.5 text-right">GST</th><th className="px-5 py-2.5 text-right">Sales</th></tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {report.daily.map((d) => (
                    <tr key={d.date}><td className="px-5 py-2.5">{dayShort(d.date)}</td><td className="px-3 py-2.5 text-right tabular-nums">{d.orders}</td><td className="px-3 py-2.5 text-right tabular-nums">{d.cancelled}</td><td className="px-3 py-2.5 text-right tabular-nums">{formatINR(d.tax)}</td><td className="px-5 py-2.5 text-right font-semibold tabular-nums">{formatINR(d.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
