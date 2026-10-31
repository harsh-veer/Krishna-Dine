import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocket, ORDER_EVENTS } from '../services/socket';
import { orderApi } from '../services/endpoints';
import { tokenStore } from '../services/api';

/** Newer wins: compares version, then updatedAt. Prevents stale or duplicate events overwriting state. */
function isNewer(incoming, existing) {
  if (!existing) return true;
  if ((incoming.version ?? 0) !== (existing.version ?? 0)) return (incoming.version ?? 0) > (existing.version ?? 0);
  return new Date(incoming.updatedAt) >= new Date(existing.updatedAt);
}

/**
 * Live list of orders for staff screens: loads via REST, then applies Socket.IO events.
 * Reloads after every reconnect so nothing is missed while offline.
 */
export function useStaffOrders({ params, onNewOrder, onEvent } = {}) {
  const [orders, setOrders] = useState({});
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seenEvents = useRef(new Set());
  const seenNew = useRef(new Set());
  const cb = useRef({ onNewOrder, onEvent });
  cb.current = { onNewOrder, onEvent };
  const paramsKey = JSON.stringify(params || {});

  const upsert = useCallback((order) => {
    setOrders((prev) => (isNewer(order, prev[order.id]) ? { ...prev, [order.id]: order } : prev));
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await orderApi.list({ limit: 200, ...JSON.parse(paramsKey) });
      setOrders((prev) => {
        const next = {};
        res.data.forEach((o) => {
          next[o.id] = isNewer(o, prev[o.id]) ? o : prev[o.id];
          seenNew.current.add(o.id);
        });
        return next;
      });
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    reload();
    const socket = createSocket({ token: tokenStore.get() });
    socket.on('connect', () => {
      setConnected(true);
      reload();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    ORDER_EVENTS.forEach((evt) => {
      socket.on(evt, (payload) => {
        if (!payload?.order || seenEvents.current.has(payload.eventId)) return;
        seenEvents.current.add(payload.eventId);
        if (seenEvents.current.size > 2000) seenEvents.current = new Set([...seenEvents.current].slice(-500));
        upsert(payload.order);
        if (evt === 'new-order' && !seenNew.current.has(payload.order.id)) {
          seenNew.current.add(payload.order.id);
          cb.current.onNewOrder?.(payload.order);
        }
        cb.current.onEvent?.(evt, payload);
      });
    });

    // Safety net in case a WebSocket is silently dropped by a proxy.
    const poll = setInterval(() => {
      if (!socket.connected) reload();
    }, 15000);

    return () => {
      clearInterval(poll);
      socket.close();
    };
  }, [reload, upsert]);

  return { orders: Object.values(orders), upsert, reload, connected, loading, error };
}
