import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../services/storage';

const CartContext = createContext(null);

/** Cart is scoped to a table's QR token so carts never leak between tables. */
export function CartProvider({ tableToken, children }) {
  const key = `kd_cart_${tableToken}`;
  const [lines, setLines] = useState(() => storage.get(key, []));
  const [instructions, setInstructions] = useState(() => storage.get(`${key}_note`, ''));

  useEffect(() => storage.set(key, lines), [key, lines]);
  useEffect(() => storage.set(`${key}_note`, instructions), [key, instructions]);

  const add = useCallback((item) => {
    setLines((prev) => {
      const found = prev.find((l) => l.id === item.id);
      if (found) return prev.map((l) => (l.id === item.id ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l));
      return [...prev, { id: item.id, name: item.name, price: item.price, isVegetarian: item.isVegetarian, quantity: 1 }];
    });
  }, []);

  const setQuantity = useCallback((id, quantity) => {
    setLines((prev) => (quantity <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, quantity: Math.min(50, quantity) } : l))));
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
          return { ...l, name: m.name, price: m.price, isVegetarian: m.isVegetarian, unavailable: !m.isAvailable };
        })
    );
  }, []);

  const value = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
    const qty = (id) => lines.find((l) => l.id === id)?.quantity || 0;
    return { lines, count, subtotal, qty, add, setQuantity, clear, instructions, setInstructions, syncWithMenu };
  }, [lines, add, setQuantity, clear, instructions, syncWithMenu]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
