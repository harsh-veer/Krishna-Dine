const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatINR = (n) => inr.format(Number(n) || 0);
export const formatINR2 = (n) => inr2.format(Number(n) || 0);

const TZ = 'Asia/Kolkata';
export const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
export const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
export const formatDateTime = (d) => `${formatDate(d)}, ${formatTime(d)}`;

/** Today's date as YYYY-MM-DD in IST. */
export function todayKey(date = new Date()) {
  return new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 10);
}

export function elapsed(from, now = Date.now()) {
  const secs = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const minutesSince = (from, now = Date.now()) => (now - new Date(from).getTime()) / 60000;

export const STATUS_META = {
  pending: { label: 'Pending', tone: 'amber', description: 'Waiting for the kitchen to accept' },
  accepted: { label: 'Accepted', tone: 'blue', description: 'The kitchen has accepted your order' },
  preparing: { label: 'Preparing', tone: 'violet', description: 'Your food is being cooked' },
  ready: { label: 'Ready', tone: 'green', description: 'Ready! It will be served shortly' },
  served: { label: 'Served', tone: 'slate', description: 'Enjoy your meal' },
  cancelled: { label: 'Cancelled', tone: 'red', description: 'This order was cancelled' },
};

export const PAYMENT_LABEL = { cash: 'Cash', upi: 'UPI', card: 'Card' };

export const uid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9_-]/g, '');
