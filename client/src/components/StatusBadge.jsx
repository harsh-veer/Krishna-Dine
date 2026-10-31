import Badge from './ui/Badge';
import { STATUS_META } from '../utils/format';

export default function StatusBadge({ status, className = '' }) {
  const meta = STATUS_META[status] || { label: status, tone: 'slate' };
  return <Badge tone={meta.tone} className={className}>{meta.label}</Badge>;
}

export function PaymentBadge({ status }) {
  const tone = status === 'paid' ? 'green' : status === 'failed' ? 'red' : 'amber';
  return <Badge tone={tone}>{status === 'paid' ? 'Paid' : status === 'failed' ? 'Failed' : 'Unpaid'}</Badge>;
}
