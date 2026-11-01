import { Minus, Plus, Clock } from 'lucide-react';
import FoodImage from '../../components/FoodImage';
import VegMark from '../../components/VegMark';
import { formatINR } from '../../utils/format';
import { useCart } from '../../context/CartContext';

export function QtyStepper({ value, onChange, size = 'md', disabled }) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  return (
    <div className={`inline-flex ${h} items-center overflow-hidden rounded-xl bg-brand-900 text-cream-50 shadow-sm`}>
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(value - 1)} className={`flex ${h} w-9 items-center justify-center hover:bg-brand-800`}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={disabled || value >= 50} onClick={() => onChange(value + 1)} className={`flex ${h} w-9 items-center justify-center hover:bg-brand-800 disabled:opacity-40`}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function MenuItemCard({ item }) {
  const cart = useCart();
  const qty = cart.qty(item.id);
  const soldOut = !item.isAvailable;

  return (
    <article className={`card flex gap-3.5 p-3 transition ${soldOut ? 'opacity-60' : 'hover:shadow-lift'}`} data-testid="menu-item">
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-2">
          <VegMark veg={item.isVegetarian} />
          {soldOut && <span className="chip bg-red-50 text-red-700">Sold out</span>}
        </div>
        <h3 className="mt-1.5 font-bold leading-snug text-brand-950">{item.name}</h3>
        <div className="mt-0.5 font-semibold text-brand-800">{formatINR(item.price)}</div>
        {item.description && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-brand-900/60">{item.description}</p>}
        {item.preparationTime > 0 && (
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-900/45">
            <Clock className="h-3 w-3" /> ~{item.preparationTime} min
          </div>
        )}
      </div>
      <div className="relative flex w-[7.25rem] shrink-0 flex-col items-center">
        <FoodImage src={item.image} name={item.name} category={item.categoryName} className="h-[6.75rem] w-full rounded-2xl" />
        <div className="relative z-10 -mt-5">
          {soldOut ? (
            <span className="inline-flex h-10 items-center rounded-xl border border-cream-300 bg-white px-4 text-xs font-bold text-brand-900/50">Unavailable</span>
          ) : qty > 0 ? (
            <QtyStepper value={qty} onChange={(v) => cart.setQuantity(item.id, v)} />
          ) : (
            <button
              type="button"
              onClick={() => cart.add(item)}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-brand-200 bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-brand-700 shadow-soft transition hover:bg-brand-50 active:scale-95"
              aria-label={`Add ${item.name}`}
            >
              Add <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
