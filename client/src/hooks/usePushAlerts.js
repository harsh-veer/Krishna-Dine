import { useCallback, useEffect, useState } from 'react';
import { pushApi } from '../services/endpoints';

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Background order alerts via Web Push: they arrive even when the screen is off or another app is open. */
export function usePushAlerts() {
  const [state, setState] = useState(supported() ? (Notification.permission === 'denied' ? 'denied' : 'off') : 'unsupported');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported() || Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) return;
        setState('on');
        try { await pushApi.subscribe(sub.toJSON()); } catch { /* retried next visit */ }
      })
      .catch(() => {});
  }, []);

  const enable = useCallback(async () => {
    if (!supported()) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return false; }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await pushApi.key();
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      await pushApi.subscribe(sub.toJSON());
      setState('on');
      return true;
    } catch {
      setState('off');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await pushApi.unsubscribe(sub.endpoint).catch(() => {}); await sub.unsubscribe(); }
    setState('off');
  }, []);

  return { state, busy, enable, disable, test: () => pushApi.test() };
}
