import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, ReceiptText, RefreshCw, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '../../layouts/AdminLayout';
import StatusBadge, { PaymentBadge } from '../../components/StatusBadge';
import { Button, ConfirmDialog, EmptyState, Input, Modal, Select, Spinner } from '../../components/ui';
import { orderApi, tableApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { createSocket, ORDER_EVENTS } from '../../services/socket';
import { tokenStore } from '../../services/api';
import { formatDateTime, formatINR, todayKey, PAYMENT_LABEL } from '../../utils/format';

const STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'served', 'cancelled'];

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const [tables, setTables] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('search') || '');
  const [selected, setSelected] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [rowDelete, setRowDelete] = useState(null);
  const debounced = useDebounce(search, 300);

  const filters = {
    date: params.get('date') ?? todayKey(),
    table: params.get('table') || '',
    status: params.get('status') || '',
    paymentStatus: params.get('paymentStatus') || '',
    page: Number(params.get('page') || 1),
  };
  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries({ ...patch, page: patch.page ?? 1 }).forEach(([k, v]) => (v === '' || v === null || v === undefined ? next.delete(k) : next.set(k, v)));
    if (patch.date === '') next.set('date', '');
    setParams(next, { replace: true });
  };

  const isDeletable = (o) => o.isClosed || o.orderStatus === 'cancelled';
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const load = useCallback(async () => {
    try {
      const q = { page: filters.page, limit: 25 };
      if (filters.date) q.date = filters.date;
      if (filters.table) q.table = filters.table;
      if (filters.status) q.status = filters.status;
      if (filters.paymentStatus) q.paymentStatus = filters.paymentStatus;
      if (debounced.trim()) q.search = debounced.trim();
      const res = await orderApi.list(q);
      setResult(res);
      setSelected((prev) => new Set([...prev].filter((id) => res.data.some((o) => o.id === id))));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.date, filters.table, filters.status, filters.paymentStatus, filters.page, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    tableApi.list().then(setTables).catch(() => {});
  }, []);

  // Refresh the list when any order changes.
  useEffect(() => {
    const socket = createSocket({ token: tokenStore.get() });
    let t;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(load, 400);
    };
    ORDER_EVENTS.forEach((e) => socket.on(e, refresh));
    return () => {
      clearTimeout(t);
      socket.close();
    };
  }, [load]);

  const deletableOnPage = (result?.data || []).filter(isDeletable);
  const allSelected = deletableOnPage.length > 0 && deletableOnPage.every((o) => selected.has(o.id));

  const doDelete = async () => {
    setDeleting(true);
    try {
      const res = await orderApi.bulkDelete([...selected]);
      toast.success(`${res.deleted.length} order${res.deleted.length === 1 ? '' : 's'} deleted${res.skipped.length ? `, ${res.skipped.length} skipped` : ''}`);
      setSelected(new Set());
      setConfirmDelete(false);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const doRowDelete = async () => {
    setDeleting(true);
    try {
      await orderApi.remove(rowDelete.id);
      toast.success(`${rowDelete.orderNumber} deleted`);
      setRowDelete(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Orders & billing"
        description="Filter orders, open one to see details, generate its bill and record payment."
        actions={
          <>
            <Button variant="secondary" icon={Trash2} onClick={() => setPurgeOpen(true)} data-testid="purge-old">Clean up old orders</Button>
            <Button variant="secondary" icon={RefreshCw} onClick={load}>Refresh</Button>
          </>
        }
      />
      {selected.size > 0 && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50/60 px-4 py-3" data-testid="bulk-bar">
          <span className="text-sm font-semibold text-brand-950">{selected.size} order{selected.size === 1 ? '' : 's'} selected</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmDelete(true)} data-testid="delete-selected">Delete selected</Button>
          </div>
        </div>
      )}

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-900/40" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order no., name, phone" className="pl-9" aria-label="Search orders" />
        </label>
        <div className="flex gap-2">
          <Input type="date" value={filters.date} onChange={(e) => set({ date: e.target.value })} aria-label="Filter by date" />
          {filters.date && <Button variant="ghost" size="sm" className="h-auto" onClick={() => set({ date: '' })}>All</Button>}
        </div>
        <Select value={filters.table} onChange={(e) => set({ table: e.target.value })} aria-label="Filter by table">
          <option value="">All tables</option>
          {tables.map((t) => <option key={t.id} value={t.id}>Table {t.tableNumber}</option>)}
        </Select>
        <Select value={filters.status} onChange={(e) => set({ status: e.target.value })} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </Select>
        <Select value={filters.paymentStatus} onChange={(e) => set({ paymentStatus: e.target.value })} aria-label="Filter by payment">
          <option value="">Paid and unpaid</option>
          <option value="pending">Unpaid</option>
          <option value="paid">Paid</option>
        </Select>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="card overflow-hidden">
        {!result ? (
          <Spinner />
        ) : result.data.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No orders found" message="Try a different date or clear the filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-cream-100 text-left text-xs font-bold uppercase tracking-wider text-brand-900/50">
                <tr>
                  <th className="w-10 py-3 pl-5">
                    <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={allSelected} disabled={deletableOnPage.length === 0} onChange={() => setSelected(allSelected ? new Set() : new Set(deletableOnPage.map((o) => o.id)))} aria-label="Select all finished orders on this page" title="Select all closed or cancelled orders on this page" />
                  </th>
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Table</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Placed</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="w-14 py-3 pr-5 text-right"><span className="sr-only">Delete</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {result.data.map((o) => (
                  <tr key={o.id} className="hover:bg-cream-50" data-testid="order-row">
                    <td className="py-3 pl-5">
                      <input type="checkbox" className="h-4 w-4 accent-brand-700 disabled:opacity-30" checked={selected.has(o.id)} disabled={!isDeletable(o)} onChange={() => toggle(o.id)} aria-label={`Select ${o.orderNumber}`} title={isDeletable(o) ? 'Select for deletion' : 'Only closed or cancelled orders can be deleted'} data-testid="row-select" />
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/admin/orders/${o.id}`} className="font-mono font-bold text-brand-800 hover:underline">{o.orderNumber}</Link>
                      <div className="text-xs text-brand-900/50">{o.items.reduce((s, i) => s + i.quantity, 0)} items{o.isClosed ? ' · closed' : ''}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold">{o.tableNumber}</td>
                    <td className="px-3 py-3">{o.customerName}<div className="text-xs text-brand-900/50">{o.customerPhone}</div></td>
                    <td className="px-3 py-3 text-brand-900/70">{formatDateTime(o.createdAt)}</td>
                    <td className="px-3 py-3"><StatusBadge status={o.orderStatus} /></td>
                    <td className="px-3 py-3"><PaymentBadge status={o.paymentStatus} />{o.paymentMethod && <span className="ml-1 text-xs text-brand-900/50">{PAYMENT_LABEL[o.paymentMethod]}</span>}</td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums">{formatINR(o.totalAmount)}</td>
                    <td className="py-3 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => setRowDelete(o)}
                        disabled={!isDeletable(o)}
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-brand-900/20 disabled:hover:bg-transparent"
                        title={isDeletable(o) ? 'Delete this order' : 'Close or cancel the order before deleting'}
                        aria-label={`Delete ${o.orderNumber}`}
                        data-testid="row-delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && result.meta.pages > 1 && (
          <div className="flex items-center justify-between border-t border-cream-200 px-5 py-3 text-sm">
            <span className="text-brand-900/60">{result.meta.total} orders · page {result.meta.page} of {result.meta.pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={filters.page <= 1} onClick={() => set({ page: filters.page - 1 })}>Prev</Button>
              <Button variant="secondary" size="sm" disabled={filters.page >= result.meta.pages} onClick={() => set({ page: filters.page + 1 })}>Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        danger
        loading={deleting}
        title={`Delete ${selected.size} order${selected.size === 1 ? '' : 's'}?`}
        message="This permanently removes the selected orders with their bills and payment records. Sales reports will no longer include them. This cannot be undone. Export your reports first if you need the figures."
        confirmLabel="Delete permanently"
        onConfirm={doDelete}
      />
      <ConfirmDialog
        open={!!rowDelete}
        onClose={() => setRowDelete(null)}
        danger
        loading={deleting}
        title={`Delete ${rowDelete?.orderNumber || 'order'}?`}
        message="This permanently removes the order with its bill and payment records. Sales reports will no longer include it. This cannot be undone."
        confirmLabel="Delete permanently"
        onConfirm={doRowDelete}
      />
      {purgeOpen && <PurgeModal onClose={() => setPurgeOpen(false)} onDone={() => { setPurgeOpen(false); setSelected(new Set()); load(); }} />}
    </>
  );
}

function PurgeModal({ onClose, onDone }) {
  const [days, setDays] = useState(90);
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCount(null);
    const t = setTimeout(() => {
      orderApi.purgeOld(Number(days), true).then((r) => setCount(r.matching)).catch(() => setCount(null));
    }, 300);
    return () => clearTimeout(t);
  }, [days]);

  const run = async () => {
    setBusy(true);
    try {
      const r = await orderApi.purgeOld(Number(days));
      toast.success(`${r.deleted.length} old order${r.deleted.length === 1 ? '' : 's'} deleted`);
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Clean up old orders"
      description="Deletes closed and cancelled orders older than the number of days you choose. Open orders are never touched."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" icon={Trash2} onClick={run} loading={busy} disabled={!count} data-testid="purge-confirm">
            {count ? `Delete ${count} order${count === 1 ? '' : 's'}` : 'Nothing to delete'}
          </Button>
        </>
      }
    >
      <label className="label" htmlFor="purge-days">Older than (days)</label>
      <Select id="purge-days" value={days} onChange={(e) => setDays(e.target.value)}>
        {[7, 30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
      </Select>
      <p className="mt-3 text-sm text-brand-900/70" data-testid="purge-count">
        {count === null ? 'Counting…' : `${count} finished order${count === 1 ? '' : 's'} match.`}
      </p>
      <p className="mt-2 text-xs text-brand-900/50">This permanently removes the orders, bills and payments, and they will no longer appear in reports. Export your monthly CSV reports first if you need the figures.</p>
    </Modal>
  );
}
