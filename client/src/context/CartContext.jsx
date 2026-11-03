import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../services/storage';

const CartContext = createContext(null);

/** Cart is scoped to a table's QR token so carts never leak between tables. */
export function CartProvider({ tableToken, children }) {
  const key = `kd_cart_${tableToken}`;
  const [lines, setLines] = useState(() => storage.get(key, []).map((l) => ({ ...l, key: l.key || l.id, size: l.size || '', addons: l.addons || [], notes: l.notes || '' })));
  const [instructions, setInstructions] = useState(() => storage.get(`${key}_note`, ''));

  useEffect(() => storage.set(key, lines), [key, lines]);
  useEffect(() => storage.set(`${key}_note`, instructions), [key, instructions]);

  const hasOptions = (item) => (item.sizes?.length || 0) > 0 || (item.addons?.length || 0) > 0;

  /** Unit price and display label for an item with the chosen size and extras. Returns null if a choice is no longer offered. */
  const priced = (item, size, addons) => {
    let unit = item.price;
    if (item.sizes?.length) {
      const s = item.sizes.find((x) => x.label === size);
      if (!s) return null;
      unit = s.price;
    }
    for (const name of addons) {
      const ad = (item.addons || []).find((x) => x.name === name);
      if (!ad) return null;
      unit += ad.price;
    }
    return Math.round(unit * 100) / 100;
  };

  const lineKey = (id, size = '', addons = []) => (size || addons.length ? [id, size, [...addons].sort().join('|')].join('::') : id);

  const add = useCallback((item, opts = {}) => {
    const size = opts.size || '';
    const addons = [...(opts.addons || [])].sort();
    const key = lineKey(item.id, size, addons);
    const unit = priced(item, size, addons);
    if (unit === null) return;
    setLines((prev) => {
      const found = prev.find((l) => l.key === key);
      if (found) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l));
      return [...prev, { key, id: item.id, name: item.name, nameHi: item.nameHi || '', size, addons, notes: opts.notes || '', price: unit, isVegetarian: item.isVegetarian, quantity: 1 }];
    });
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    setLines((prev) => (quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, quantity) } : l))));
  }, []);

  const setNote = useCallback((key, notes) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, notes: notes.slice(0, 120) } : l)));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setInstructions('');
  }, []);

  /** Refreshes names/prices from the live menu and drops items that disappeared. */
  const syncWithMenu = useCallback((items) => {
    const byId = new Map(items.map((i) => [i.id, i]));
    setLines((prev) =>
      prev
        .filter((l) => byId.has(l.id))
        .map((l) => {
          const m = byId.get(l.id);
          const unit = priced(m, l.size || '', l.addons || []);
          return {
            ...l,
            key: l.key || lineKey(l.id, l.size, l.addons),
            name: m.name,
            nameHi: m.nameHi || '',
            price: unit === null ? l.price : unit,
            isVegetarian: m.isVegetarian,
            unavailable: !m.isAvailable || unit === null,
          };
        })
    );
  }, []);

  const value = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
    const qty = (id) => lines.filter((l) => l.id === id).reduce((n, l) => n + l.quantity, 0);
    return { lines, count, subtotal, qty, hasOptions, add, setQuantity, setNote, clear, instructions, setInstructions, syncWithMenu };
  }, [lines, add, setQuantity, setNote, clear, instructions, syncWithMenu]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
