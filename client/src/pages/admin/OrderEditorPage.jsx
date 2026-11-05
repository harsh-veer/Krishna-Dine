import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '../../layouts/AdminLayout';
import { Button, EmptyState, Field, Input, Modal, Select, Spinner, Textarea } from '../../components/ui';
import VegMark from '../../components/VegMark';
import { menuApi, orderApi, settingsApi, tableApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import { formatINR } from '../../utils/format';

const lineKey = (id, size = '', addons = []) => [id, size, [...addons].sort().join('|')].join('::');
const hasOptions = (item) => (item.sizes?.length || 0) > 0 || (item.addons?.length || 0) > 0;

function unitPrice(item, size, addons) {
  let unit = item.price;
  if (item.sizes?.length) unit = item.sizes.find((s) => s.label === size)?.price ?? item.price;
  for (const a of addons) unit += item.addons.find((x) => x.name === a)?.price || 0;
  return Math.round(unit * 100) / 100;
}

function estimate(lines, serviceRate) {
  const subtotal = lines.reduce((s, l) => s + Math.round(l.price * 100) * l.quantity, 0);
  const service = Math.round((subtotal * serviceRate) / 100);
  return { subtotal: subtotal / 100, service: service / 100, total: Math.round((subtotal + service) / 100) };
}

/** Admin: place an order for a table (mode "new") or change an open order (mode "edit"). */
export default function OrderEditorPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = mode === 'edit';
  const [menu, setMenu] = useState(null);
  const [tables, setTables] = useState([]);
  const [settings, setSettings] = useState(null);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [lines, setLines] = useState([]);
  const [tableId, setTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('');
  const [picking, setPicking] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const jobs = [menuApi.list({}), settingsApi.get()];
    if (editing) jobs.push(orderApi.get(id));
    else jobs.push(tableApi.list());
    Promise.all(jobs)
      .then(([m, s, x]) => {
        setMenu(m);
        setSettings(s);
        if (editing) {
          setOrder(x);
          setCustomerName(x.customerName || '');
          setCustomerPhone(x.customerPhone || '');
          setInstructions(x.specialInstructions || '');
          setLines(x.items.map((i, idx) => ({ key: `old-${idx}`, lineIndex: idx, menuItemId: i.menuItem, name: i.name, price: i.price, quantity: i.quantity, notes: i.notes || '', isVegetarian: i.isVegetarian })));
        } else {
          setTables(x.filter((t) => t.isActive));
          setCustomerName('Walk-in');
        }
      })
      .catch((e) => setError(errorMessage(e)));
  }, [editing, id]);

  const items = useMemo(() => {
    if (!menu) return [];
    const q = query.trim().toLowerCase();
    return menu.items.filter((i) => (!cat || i.category === cat) && (!q || i.name.toLowerCase().includes(q) || (i.nameHi || '').includes(q)));
  }, [menu, query, cat]);

  const rates = editing && order ? { service: order.serviceChargeRate } : { service: settings?.serviceChargeEnabled ? settings.serviceChargeRate : 0 };
  const totals = estimate(lines, rates.service);

  const addLine = (item, size = '', addons = [], notes = '') => {
    const key = lineKey(item.id, size, addons);
    const price = unitPrice(item, size, addons);
    const label = `${item.name}${size ? ` (${size})` : ''}${addons.length ? ` + ${addons.join(', ')}` : ''}`;
    setLines((prev) => {
      const found = prev.find((l) => l.key === key && l.lineIndex === undefined);
      if (found) return prev.map((l) => (l === found ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l));
      return [...prev, { key, menuItemId: item.id, name: label, size, addons, price, quantity: 1, notes, isVegetarian: item.isVegetarian }];
    });
  };
  const setQty = (key, q) => setLines((prev) => (q <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, q) } : l))));
  const setNote = (key, notes) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, notes: notes.slice(0, 120) } : l)));

  const save = async () => {
    if (!lines.length) return toast.error('Add at least one item');
    if (!editing && !tableId) return toast.error('Choose a table');
    setSaving(true);
    try {
      const itemsBody = lines.map((l) =>
        l.lineIndex !== undefined
          ? { lineIndex: l.lineIndex, quantity: l.quantity, notes: l.notes }
          : { menuItemId: l.menuItemId, quantity: l.quantity, size: l.size || '', addons: l.addons || [], notes: l.notes || '' }
      );
      const common = { customerName: customerName.trim() || (editing ? order.customerName : 'Walk-in'), customerPhone, specialInstructions: instructions };
      const saved = editing ? await orderApi.edit(id, { ...common, items: itemsBody }) : await orderApi.createByAdmin({ ...common, tableId, items: itemsBody });
      toast.success(editing ? 'Order updated' : `Order ${saved.orderNumber} placed`);
      navigate(`/admin/orders/${saved.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>;
  if (!menu || !settings || (editing && !order)) return <Spinner />;
  if (editing && (order.isClosed || order.orderStatus === 'cancelled' || order.paymentStatus === 'paid')) {
    return (
      <EmptyState
        title="This order cannot be edited"
        message="Closed, cancelled and paid orders are locked so the bill stays correct."
        action={<Link to={`/admin/orders/${id}`}><Button variant="secondary">Back to the order</Button></Link>}
      />
    );
  }

  return (
    <>
      <Link to={editing ? `/admin/orders/${id}` : '/admin/orders'} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> {editing ? 'Back to the order' : 'All orders'}
      </Link>
      <PageHeader
        title={editing ? `Edit ${order.orderNumber}` : 'New order'}
        description={editing ? `Table ${order.tableNumber}. Existing items keep their original price. The bill is recalculated when you save.` : 'Place an order for a table: walk-in guests, phone orders or customers who cannot scan.'}
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-900/40" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes" className="pl-10" aria-label="Search dishes" data-testid="editor-search" />
            </label>
            <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {menu.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <ul className="mt-3 max-h-[60vh] divide-y divide-cream-200 overflow-y-auto">
            {items.length === 0 && <li className="py-8 text-center text-sm text-brand-900/55">No dishes found</li>}
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5" data-testid="editor-item">
                <VegMark veg={i.isVegetarian} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{i.name}</div>
                  <div className="text-xs text-brand-900/55">
                    {i.categoryName}{!i.isAvailable && <span className="ml-1.5 font-bold text-red-600">Sold out</span>}
                  </div>
                </div>
                <div className="text-right text-sm font-bold tabular-nums">{i.sizes?.length > 0 && <span className="mr-1 text-xs font-medium text-brand-900/50">from</span>}{formatINR(i.price)}</div>
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => (hasOptions(i) ? setPicking(i) : addLine(i))} data-testid="editor-add">{hasOptions(i) ? 'Options' : 'Add'}</Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="card p-4">
            <h2 className="mb-3 font-bold">Order</h2>
            {!editing && (
              <Field label="Table" htmlFor="editor-table">
                <Select id="editor-table" value={tableId} onChange={(e) => setTableId(e.target.value)} data-testid="editor-table">
                  <option value="">Choose a table</option>
                  {tables.map((t) => <option key={t.id} value={t.id}>Table {t.tableNumber}</option>)}
                </Select>
              </Field>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Customer name" htmlFor="editor-name"><Input id="editor-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={60} data-testid="editor-name" /></Field>
              <Field label="Mobile (optional)" htmlFor="editor-phone"><Input id="editor-phone" type="tel" inputMode="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="10-digit number" /></Field>
            </div>
            <div className="mt-3">
              <Field label="Instructions for the kitchen" htmlFor="editor-instr"><Textarea id="editor-instr" rows={2} maxLength={500} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></Field>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="mb-2 font-bold">Items <span className="text-sm font-medium text-brand-900/50">({lines.reduce((n, l) => n + l.quantity, 0)})</span></h2>
            {lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-brand-900/55">Nothing added yet. Pick dishes from the list.</p>
            ) : (
              <ul className="divide-y divide-cream-200" data-testid="editor-lines">
                {lines.map((l) => (
                  <li key={l.key} className="py-2.5" data-testid="editor-line">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-snug">{l.name}</div>
                        <div className="text-xs text-brand-900/55">{formatINR(l.price)} each</div>
                      </div>
                      <div className="inline-flex items-center overflow-hidden rounded-lg border border-cream-300">
                        <button type="button" className="p-1.5 hover:bg-cream-100" onClick={() => setQty(l.key, l.quantity - 1)} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                        <span className="w-7 text-center text-sm font-bold tabular-nums" data-testid="line-qty">{l.quantity}</span>
                        <button type="button" className="p-1.5 hover:bg-cream-100" onClick={() => setQty(l.key, l.quantity + 1)} aria-label="Increase"><Plus className="h-4 w-4" /></button>
                      </div>
                      <div className="w-16 text-right text-sm font-bold tabular-nums">{formatINR(l.price * l.quantity)}</div>
                      <button type="button" className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" onClick={() => setQty(l.key, 0)} aria-label={`Remove ${l.name}`} data-testid="line-remove"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <input value={l.notes} onChange={(e) => setNote(l.key, e.target.value)} maxLength={120} placeholder="Note for this dish" className="mt-1.5 w-full rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-xs" aria-label={`Note for ${l.name}`} />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 space-y-1 border-t border-dashed border-cream-300 pt-3 text-sm text-brand-900/75">
              <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatINR(totals.subtotal)}</span></div>
              {rates.service > 0 && <div className="flex justify-between"><span>Service charge ({rates.service}%)</span><span className="tabular-nums">{formatINR(totals.service)}</span></div>}
              <div className="flex justify-between pt-1 text-base font-extrabold text-brand-950"><span>Estimated total</span><span className="tabular-nums" data-testid="editor-total">{formatINR(totals.total)}</span></div>
            </div>
            <Button className="mt-4 w-full" size="lg" loading={saving} disabled={!lines.length} onClick={save} data-testid="editor-save">{editing ? 'Save changes' : 'Place order'}</Button>
          </div>
        </div>
      </div>
      {picking && <OptionPicker item={picking} onClose={() => setPicking(null)} onAdd={(size, addons, notes) => { addLine(picking, size, addons, notes); setPicking(null); }} />}
    </>
  );
}

function OptionPicker({ item, onClose, onAdd }) {
  const [size, setSize] = useState(item.sizes?.length === 1 ? item.sizes[0].label : '');
  const [addons, setAddons] = useState([]);
  const [notes, setNotes] = useState('');
  const needsSize = item.sizes?.length > 0;
  const total = needsSize && !size ? null : unitPrice(item, size, addons);
  const toggle = (n) => setAddons((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  return (
    <Modal
      open
      onClose={onClose}
      title={item.name}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={needsSize && !size} onClick={() => onAdd(size, addons, notes.trim())} data-testid="picker-add">Add {total !== null ? `· ${formatINR(total)}` : ''}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {needsSize && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold">Size</legend>
            <div className="space-y-1.5">
              {item.sizes.map((s) => (
                <label key={s.label} className="flex cursor-pointer items-center justify-between rounded-xl border border-cream-300 px-3 py-2">
                  <span className="flex items-center gap-2"><input type="radio" name="picker-size" checked={size === s.label} onChange={() => setSize(s.label)} className="accent-brand-700" data-testid="picker-size" /> {s.label}</span>
                  <span className="font-bold tabular-nums">{formatINR(s.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {item.addons?.length > 0 && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-bold">Extras</legend>
            <div className="space-y-1.5">
              {item.addons.map((a) => (
                <label key={a.name} className="flex cursor-pointer items-center justify-between rounded-xl border border-cream-300 px-3 py-2">
                  <span className="flex items-center gap-2"><input type="checkbox" checked={addons.includes(a.name)} onChange={() => toggle(a.name)} className="accent-brand-700" /> {a.name}</span>
                  <span className="font-bold tabular-nums">+{formatINR(a.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <Field label="Note for the kitchen (optional)"><Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={120} /></Field>
      </div>
    </Modal>
  );
}
