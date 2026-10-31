import { storage } from '../../services/storage';

const KEY = 'kd_my_orders';

/** Orders placed from this device; the tracking token proves ownership to the API. */
export const myOrders = {
  all: () => storage.get(KEY, []),
  forTable: (tableToken) => storage.get(KEY, []).filter((o) => o.tableToken === tableToken),
  find: (id) => storage.get(KEY, []).find((o) => o.id === id),
  add: (entry) => {
    const list = storage.get(KEY, []).filter((o) => o.id !== entry.id);
    list.unshift(entry);
    storage.set(KEY, list.slice(0, 30));
  },
  update: (id, patch) => {
    storage.set(
      KEY,
      storage.get(KEY, []).map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  },
};
