import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Armchair, Copy, Download, ExternalLink, FileArchive, Maximize2, Pencil, Plus, Power, Printer, QrCode, RefreshCw, Share2, Trash2, X } from 'lucide-react';
import { PageHeader } from '../../layouts/AdminLayout';
import { Badge, Button, ConfirmDialog, EmptyState, Field, Input, Modal, Select, Spinner } from '../../components/ui';
import { tableApi } from '../../services/endpoints';
import { downloadFile, errorMessage, tokenStore } from '../../services/api';
import { createSocket } from '../../services/socket';
import { downloadQrCard } from '../../utils/qrImage';
import QrPoster from '../../components/QrPoster';

const schema = z.object({
  tableNumber: z.string().trim().min(1, 'Table number is required').max(20).regex(/^[A-Za-z0-9 _-]+$/, 'Letters, numbers, spaces or dashes'),
  label: z.string().trim().max(60),
  seats: z.coerce.number().int().min(1).max(50),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).optional(),
});

const STATUS_TONE = { available: 'green', occupied: 'amber', reserved: 'blue', cleaning: 'slate' };

export default function TablesPage() {
  const [tables, setTables] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [qrTable, setQrTable] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => tableApi.list().then(setTables).catch((e) => toast.error(errorMessage(e))), []);
  useEffect(() => {
    load();
    const socket = createSocket({ token: tokenStore.get() });
    socket.on('table-updated', load);
    socket.on('new-order', load);
    return () => socket.close();
  }, [load]);

  const openQr = async (t) => {
    try {
      setQrTable(await tableApi.qr(t.id));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const doConfirm = async () => {
    setBusy(true);
    try {
      const { type, table } = confirm;
      if (type === 'regenerate') {
        const t = await tableApi.regenerate(table.id);
        toast.success(`New QR code for table ${t.tableNumber}. Old printouts no longer work.`);
        if (qrTable?.id === t.id) setQrTable(t);
      } else if (type === 'toggle') {
        await tableApi.update(table.id, { isActive: !table.isActive });
        toast.success(table.isActive ? 'Table disabled: its QR code stops accepting orders' : 'Table enabled');
      } else if (type === 'delete') {
        const r = await tableApi.remove(table.id);
        toast.success(r.archived ? 'Table archived (it has past orders, kept for reports)' : 'Table deleted');
      }
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleSelect = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const ids = [...selected];
  const printHref = `/admin/tables/print${ids.length ? `?ids=${ids.join(',')}` : ''}`;

  return (
    <>
      <PageHeader
        title="Tables & QR codes"
        description="Each table gets its own secure QR code. Customers can only order for the table they scanned."
        actions={
          <>
            <Link to={printHref} target="_blank"><Button variant="secondary" icon={Printer}>{ids.length ? `Print ${ids.length} selected` : 'Print all QR codes'}</Button></Link>
            <Button
              variant="secondary"
              icon={FileArchive}
              onClick={() => downloadFile('/tables/qr/bulk.zip', 'krishna-dine-qr-codes.zip', ids.length ? { ids: ids.join(',') } : {}).catch((e) => toast.error(errorMessage(e)))}
            >
              {ids.length ? 'Download selected (ZIP)' : 'Download all (ZIP)'}
            </Button>
            <Button variant="secondary" icon={QrCode} onClick={async () => { try { setQrTable(await tableApi.sharedQr()); } catch (e) { toast.error(errorMessage(e)); } }} data-testid="shared-qr">One QR for all tables</Button>
            <Button icon={Plus} onClick={() => setEditing({})} data-testid="add-table">Add table</Button>
          </>
        }
      />

      {!tables ? (
        <Spinner />
      ) : tables.length === 0 ? (
        <EmptyState icon={Armchair} title="No tables yet" message="Add your first table to generate its QR code." action={<Button icon={Plus} onClick={() => setEditing({})}>Add table</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {tables.map((t) => (
            <div key={t.id} className={`card p-5 ${!t.isActive ? 'opacity-70' : ''}`} data-testid="table-card" data-table-number={t.tableNumber}>
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-cream-400 accent-brand-700" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} aria-label={`Select table ${t.tableNumber}`} />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-brand-900/45">Table</div>
                    <div className="text-3xl font-extrabold leading-none text-brand-950">{t.tableNumber}</div>
                  </div>
                </label>
                <div className="flex flex-col items-end gap-1">
                  {t.isActive ? <Badge tone={STATUS_TONE[t.status]}>{t.status[0].toUpperCase() + t.status.slice(1)}</Badge> : <Badge tone="red">QR disabled</Badge>}
                  {t.openOrders > 0 && <span className="text-xs font-semibold text-amber-700">{t.openOrders} open order{t.openOrders > 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div className="mt-2 text-sm text-brand-900/60">{t.label || `${t.seats} seats`}{t.label ? ` · ${t.seats} seats` : ''}</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button size="sm" icon={QrCode} onClick={() => openQr(t)} data-testid="view-qr">QR code</Button>
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(t)}>Edit</Button>
              </div>
              <div className="mt-2 flex justify-between">
                <Button size="xs" variant="ghost" icon={RefreshCw} onClick={() => setConfirm({ type: 'regenerate', table: t })}>Regenerate</Button>
                <Button size="xs" variant="ghost" icon={Power} onClick={() => setConfirm({ type: 'toggle', table: t })}>{t.isActive ? 'Disable' : 'Enable'}</Button>
                <Button size="xs" variant="danger-ghost" icon={Trash2} onClick={() => setConfirm({ type: 'delete', table: t })} aria-label="Delete table" />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <TableModal table={editing} onClose={() => setEditing(null)} onSaved={(t, isNew) => { setEditing(null); load(); if (isNew) openQr(t); }} />}
      {qrTable && <QrModal table={qrTable} onClose={() => setQrTable(null)} onRegenerate={() => setConfirm({ type: 'regenerate', table: qrTable })} />}
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        loading={busy}
        danger={confirm?.type !== 'toggle' || confirm?.table.isActive}
        title={
          confirm?.type === 'regenerate' ? `Regenerate QR for table ${confirm.table.tableNumber}?` : confirm?.type === 'delete' ? `Delete table ${confirm?.table.tableNumber}?` : `${confirm?.table.isActive ? 'Disable' : 'Enable'} table ${confirm?.table.tableNumber}?`
        }
        message={
          confirm?.type === 'regenerate'
            ? 'A new secure QR code is created and the printed one stops working immediately. Print and place the new code on the table.'
            : confirm?.type === 'delete'
              ? 'Tables with past orders are archived so reports stay correct. Tables with open orders cannot be deleted.'
              : confirm?.table.isActive
                ? 'Customers scanning this QR code will see that the table is not taking orders.'
                : 'Customers can order from this table again.'
        }
        confirmLabel={confirm?.type === 'regenerate' ? 'Regenerate' : confirm?.type === 'delete' ? 'Delete' : confirm?.table.isActive ? 'Disable' : 'Enable'}
      />
    </>
  );
}

function TableModal({ table, onClose, onSaved }) {
  const isNew = !table.id;
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { tableNumber: table.tableNumber || '', label: table.label || '', seats: table.seats || 4, status: table.status || 'available' },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      const body = isNew ? { tableNumber: v.tableNumber, label: v.label, seats: v.seats } : v;
      const t = isNew ? await tableApi.create(body) : await tableApi.update(table.id, body);
      toast.success(isNew ? `Table ${t.tableNumber} created with a new QR code` : 'Table updated');
      onSaved(t, isNew);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add table' : `Edit table ${table.tableNumber}`} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onSubmit} loading={formState.isSubmitting} data-testid="save-table">{isNew ? 'Create table' : 'Save'}</Button></>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Table number" error={formState.errors.tableNumber?.message} hint="Shown to customers and the kitchen, e.g. 01, 12, G-2"><Input {...register('tableNumber')} placeholder="01" data-testid="table-number-input" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seats" error={formState.errors.seats?.message}><Input type="number" min="1" {...register('seats')} /></Field>
          {!isNew && (
            <Field label="Status">
              <Select {...register('status')}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="cleaning">Cleaning</option>
              </Select>
            </Field>
          )}
        </div>
        <Field label="Label (optional)" hint="e.g. Family hall, Window side"><Input {...register('label')} /></Field>
      </form>
    </Modal>
  );
}

function QrModal({ table, onClose, onRegenerate }) {
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(false);
  const shared = table.id === 'shared';
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(table.qrCodeUrl);
      toast.success('Menu link copied');
    } catch {
      toast.error('Could not copy. Long-press the link to copy it.');
    }
  };
  const share = () => navigator.share({ title: shared ? "Krishna Dine menu" : `Krishna Dine, Table ${table.tableNumber}`, url: table.qrCodeUrl }).catch(() => {});
  return (
    <>
      <Modal open onClose={onClose} title={shared ? 'One QR code for all tables' : `Table ${table.tableNumber} QR code`} description={shared ? 'Customers scan this, then pick their table number from the list. Tap the code to try it.' : 'Customers scan this to open the menu for this table. Tap the code to try it.'} size="md">
        <div className="text-center">
          <QrPoster table={table} className="max-w-[300px]" />
          {!table.isActive && <p className="mt-3 text-sm font-semibold text-red-600">This table is disabled. The code will not accept orders.</p>}
          <a href={table.qrCodeUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1 break-all text-xs font-medium text-brand-700 hover:underline" data-testid="qr-link">
            {table.qrCodeUrl} <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button icon={Download} loading={busy} onClick={async () => { setBusy(true); try { await downloadQrCard(table); } finally { setBusy(false); } }} data-testid="download-qr">Download PNG</Button>
            {shared ? <a href={table.qrCodeUrl} target="_blank" rel="noreferrer"><Button variant="secondary" icon={ExternalLink} className="w-full">Try it</Button></a> : <Link to={`/admin/tables/print?ids=${table.id}`} target="_blank"><Button variant="secondary" icon={Printer} className="w-full">Print</Button></Link>}
            <Button variant="secondary" icon={Copy} onClick={copy} data-testid="copy-link">Copy link</Button>
            {canShare ? (
              <Button variant="secondary" icon={Share2} onClick={share}>Share</Button>
            ) : (
              <Button variant="secondary" icon={Maximize2} onClick={() => setFull(true)} data-testid="qr-fullscreen">Show full screen</Button>
            )}
          </div>
          {canShare && <Button variant="ghost" size="sm" icon={Maximize2} className="mt-2" onClick={() => setFull(true)}>Show full screen</Button>}
          {!shared && <Button variant="ghost" size="sm" icon={RefreshCw} className="mt-2" onClick={onRegenerate}>Regenerate code</Button>}
          {shared && <p className="mt-3 text-xs text-brand-900/55">Anyone with this code can pick any table, so staff should still check orders. For stricter control use each table's own QR code.</p>}
        </div>
      </Modal>
      {full && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-brand-950/90 p-4" onClick={() => setFull(false)} role="dialog" aria-modal="true" aria-label="QR poster full screen">
          <button type="button" className="absolute right-4 top-4 rounded-xl bg-white/10 p-2 text-white" aria-label="Close" onClick={() => setFull(false)}><X className="h-6 w-6" /></button>
          <div className="w-full" style={{ maxWidth: 'min(92vw, 52vh)' }} onClick={(e) => e.stopPropagation()}>
            <QrPoster table={table} />
          </div>
          <p className="mt-3 text-sm text-white/70">Show this on a tablet or screen at the table. Tap anywhere outside to close.</p>
        </div>
      )}
    </>
  );
}
