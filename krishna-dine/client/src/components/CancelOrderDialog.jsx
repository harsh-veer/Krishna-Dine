import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, Button, Field, Textarea } from './ui';
import { orderApi } from '../services/endpoints';
import { errorMessage } from '../services/api';

const QUICK = ['Item out of stock', 'Customer requested cancellation', 'Duplicate order', 'Kitchen closing', 'Customer left'];

export default function CancelOrderDialog({ order, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setReason(''), [order]);
  if (!order) return null;

  const submit = async () => {
    setSaving(true);
    try {
      const updated = await orderApi.setStatus(order.id, 'cancelled', reason.trim());
      onCancelled?.(updated);
      toast.success(`Order ${order.orderNumber} cancelled`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Cancel order ${order.orderNumber}?`}
      description={`Table ${order.tableNumber} · ${order.customerName}. The customer will see this reason.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Keep order</Button>
          <Button variant="danger" onClick={submit} loading={saving} disabled={reason.trim().length < 3} data-testid="confirm-cancel">Cancel order</Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => setReason(q)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${reason === q ? 'bg-brand-900 text-cream-50 ring-brand-900' : 'bg-white text-brand-900 ring-cream-300 hover:bg-cream-100'}`}>
            {q}
          </button>
        ))}
      </div>
      <Field label="Reason" hint="Required, at least 3 characters">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Why is this order being cancelled?" />
      </Field>
    </Modal>
  );
}
