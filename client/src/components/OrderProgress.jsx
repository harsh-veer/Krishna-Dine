import { Check, ChefHat, Clock, ConciergeBell, HandPlatter, ThumbsUp } from 'lucide-react';
import { formatTime } from '../utils/format';

const STEPS = [
  { status: 'pending', label: 'Order placed', icon: Clock },
  { status: 'accepted', label: 'Accepted', icon: ThumbsUp },
  { status: 'preparing', label: 'Preparing', icon: ChefHat },
  { status: 'ready', label: 'Ready', icon: ConciergeBell },
  { status: 'served', label: 'Served', icon: HandPlatter },
];

export default function OrderProgress({ order }) {
  const idx = STEPS.findIndex((s) => s.status === order.orderStatus);
  const atByStatus = Object.fromEntries((order.statusHistory || []).map((h) => [h.status, h.at]));
  return (
    <ol className="relative space-y-0">
      {STEPS.map((step, i) => {
        const done = i < idx || order.orderStatus === 'served';
        const current = i === idx && order.orderStatus !== 'served';
        const Icon = done ? Check : step.icon;
        return (
          <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {i < STEPS.length - 1 && <span className={`absolute left-5 top-10 h-[calc(100%-2.5rem)] w-0.5 ${i < idx ? 'bg-brand-500' : 'bg-cream-300'}`} />}
            <span
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                done ? 'bg-brand-600 text-white' : current ? 'bg-gold-400 text-brand-950 animate-pulse-ring' : 'bg-cream-200 text-brand-900/40'
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="pt-2">
              <div className={`font-semibold ${done || current ? 'text-brand-950' : 'text-brand-900/40'}`}>{step.label}</div>
              {atByStatus[step.status] && <div className="text-xs text-brand-900/50">{formatTime(atByStatus[step.status])}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
