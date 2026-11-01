import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, Toggle, Input, Spinner } from '../../components/ui';
import { menuApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';

/** Lets kitchen staff mark dishes sold out (or back in stock) instantly for every customer. */
export default function MenuAvailabilityDrawer({ open, onClose }) {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) return;
    menuApi.list().then(setData).catch((e) => toast.error(errorMessage(e)));
  }, [open]);

  const items = useMemo(() => (data?.items || []).filter((i) => i.name.toLowerCase().includes(q.toLowerCase())), [data, q]);

  const toggle = async (item, value) => {
    setData((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, isAvailable: value } : i)) }));
    try {
      await menuApi.setAvailability(item.id, value);
      toast.success(`${item.name} ${value ? 'available' : 'marked sold out'}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setData((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, isAvailable: !value } : i)) }));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Item availability" description="Sold-out items are greyed out on the customer menu immediately." size="md">
      <Input placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4" />
      {!data ? (
        <Spinner />
      ) : (
        <ul className="divide-y divide-cream-200">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="font-semibold">{i.name}</div>
                <div className="text-xs text-brand-900/50">{i.categoryName}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${i.isAvailable ? 'text-brand-700' : 'text-red-600'}`}>{i.isAvailable ? 'Available' : 'Sold out'}</span>
                <Toggle checked={i.isAvailable} onChange={(v) => toggle(i, v)} label={`Toggle ${i.name}`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
