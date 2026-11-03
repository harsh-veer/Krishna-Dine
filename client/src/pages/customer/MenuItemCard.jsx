import { useState } from 'react';
import { Minus, Plus, Clock, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import FoodImage from '../../components/FoodImage';
import VegMark from '../../components/VegMark';
import { formatINR } from '../../utils/format';
import { useCart } from '../../context/CartContext';

export function QtyStepper({ value, onChange, size = 'md', disabled }) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  return (
    <div className={`inline-flex ${h} items-center overflow-hidden rounded-xl bg-[#5A5E3A] text-cream-50 shadow-sm`}>
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
  const { t, pick } = useI18n();
  const [picking, setPicking] = useState(false);
  const qty = cart.qty(item.id);
  const soldOut = !item.isAvailable;
  const custom = cart.hasOptions(item);
  const name = pick(item, 'name');
  const description = pick(item, 'description');

  return (
    <article className={`poster-card flex gap-3.5 p-3 transition duration-200 ${soldOut ? 'opacity-60' : 'hover:-translate-y-0.5 hover:shadow-lift'}`} data-testid="menu-item">
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-2">
          <VegMark veg={item.isVegetarian} />
          {soldOut && <span className="chip bg-red-50 text-red-700">{t('common.soldOut')}</span>}
        </div>
        <h3 className="mt-1.5 font-cormorant text-xl font-bold leading-snug text-[#3E4228]">{name}</h3>
        <div className="mt-0.5 font-jost font-semibold text-[#B88F4A]">
          {item.sizes?.length > 0 && <span className="mr-1 text-xs font-medium text-brand-900/50">{t('menu.from')}</span>}
          {formatINR(item.price)}
        </div>
        {description && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-brand-900/60">{description}</p>}
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
            <span className="inline-flex h-10 items-center rounded-xl border border-cream-300 bg-white px-4 text-xs font-bold text-brand-900/50">{t('common.unavailable')}</span>
          ) : qty > 0 && !custom ? (
            <QtyStepper value={qty} onChange={(v) => cart.setQuantity(item.id, v)} />
          ) : (
            <button
              type="button"
              onClick={() => (custom ? setPicking(true) : cart.add(item))}
              className="relative inline-flex h-10 items-center gap-1 rounded-xl border border-[#B88F4A] bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#5A5E3A] shadow-soft transition hover:bg-[#F6EFDF] active:scale-95"
              aria-label={`${t('common.add')} ${name}`}
            >
              {t('common.add')} <Plus className="h-4 w-4" />
              {custom && qty > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-900 px-1 text-[11px] text-cream-50">{qty}</span>}
            </button>
          )}
        </div>
      </div>
      {picking && <OptionsSheet item={item} onClose={() => setPicking(false)} />}
    </article>
  );
}

function OptionsSheet({ item, onClose }) {
  const cart = useCart();
  const { t, pick } = useI18n();
  const [size, setSize] = useState(item.sizes?.length === 1 ? item.sizes[0].label : '');
  const [addons, setAddons] = useState([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const base = item.sizes?.length ? item.sizes.find((s) => s.label === size)?.price ?? null : item.price;
  const extras = (item.addons || []).filter((a) => addons.includes(a.name)).reduce((n, a) => n + a.price, 0);
  const total = base === null ? null : base + extras;
  const toggle = (name) => setAddons((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const submit = () => {
    if (item.sizes?.length && !size) {
      setError(t('opt.required'));
      return;
    }
    cart.add(item, { size, addons, notes: notes.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={pick(item, 'name')}>
      <div className="absolute inset-0 animate-fade-in bg-brand-950/50" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg animate-slide-up flex-col rounded-t-[28px] bg-cream-50 shadow-lift">
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-cream-300" />
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
          <div>
            <h2 className="text-lg font-extrabold text-brand-950">{pick(item, 'name')}</h2>
            <p className="text-sm text-brand-900/60">{t('menu.customise')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-cream-200" aria-label={t('common.close')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-4">
          {item.sizes?.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-brand-950">{t('opt.size')}</legend>
              <div className="space-y-2">
                {item.sizes.map((s) => (
                  <label key={s.label} className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 ${size === s.label ? 'border-brand-700 bg-brand-50' : 'border-cream-300 bg-white'}`}>
                    <span className="flex items-center gap-3">
                      <input type="radio" name="size" className="h-4 w-4 accent-brand-700" checked={size === s.label} onChange={() => { setSize(s.label); setError(''); }} data-testid="opt-size" />
                      <span className="font-semibold">{s.label}</span>
                    </span>
                    <span className="font-bold tabular-nums">{formatINR(s.price)}</span>
                  </label>
                ))}
              </div>
              {error && <p className="mt-1.5 text-sm font-semibold text-red-600">{error}</p>}
            </fieldset>
          )}
          {item.addons?.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-brand-950">{t('opt.extras')}</legend>
              <div className="space-y-2">
                {item.addons.map((a) => (
                  <label key={a.name} className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 ${addons.includes(a.name) ? 'border-brand-700 bg-brand-50' : 'border-cream-300 bg-white'}`}>
                    <span className="flex items-center gap-3">
                      <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={addons.includes(a.name)} onChange={() => toggle(a.name)} data-testid="opt-addon" />
                      <span className="font-semibold">{a.name}</span>
                    </span>
                    <span className="font-bold tabular-nums text-brand-800">+{formatINR(a.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-brand-950">{t('opt.note')}</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={120} placeholder={t('opt.notePh')} className="input" />
          </label>
        </div>
        <div className="border-t border-cream-200 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={submit}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-brand-900 px-5 font-extrabold text-cream-50 active:scale-[0.99]"
            data-testid="opt-add"
          >
            <span>{t('opt.addToCart')}</span>
            <span className="tabular-nums">{total === null ? '' : formatINR(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
