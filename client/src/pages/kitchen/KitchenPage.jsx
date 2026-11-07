import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { BellRing, ChefHat, CircleCheck, ConciergeBell, Inbox, ListChecks, Volume2, VolumeX } from 'lucide-react';
import KitchenLayout from '../../layouts/KitchenLayout';
import KitchenOrderCard from './KitchenOrderCard';
import CancelOrderDialog from '../../components/CancelOrderDialog';
import MenuAvailabilityDrawer from './MenuAvailabilityDrawer';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import { useChime } from '../../hooks/useChime';
import { useNow } from '../../hooks/useNow';
import { orderApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import { Button, EmptyState, Spinner, Tabs } from '../../components/ui';

const TABS = [
  { value: 'new', label: 'New orders', icon: Inbox, statuses: ['pending'] },
  { value: 'preparing', label: 'Preparing', icon: ChefHat, statuses: ['accepted', 'preparing'] },
  { value: 'ready', label: 'Ready', icon: ConciergeBell, statuses: ['ready'] },
  { value: 'completed', label: 'Completed', icon: CircleCheck, statuses: ['served', 'cancelled'] },
];

const NEW_HIGHLIGHT_MS = 2 * 60 * 1000;

export default function KitchenPage() {
  const chime = useChime();
  const now = useNow(1000);
  const [tab, setTab] = useState('new');
  const [busy, setBusy] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [freshIds, setFreshIds] = useState({});
  const baseTitle = useRef(document.title);

  const onNewOrder = useCallback(
    (order) => {
      chime.play();
      setFreshIds((f) => ({ ...f, [order.id]: Date.now() }));
      toast.custom(
        () => (
          <div className="flex items-center gap-3 rounded-2xl bg-brand-900 px-5 py-4 text-cream-50 shadow-lift">
            <BellRing className="h-6 w-6 text-gold-400" />
            <div>
              <div className="text-lg font-extrabold">New order · Table {order.tableNumber}</div>
              <div className="text-sm text-cream-200/75">{order.items.reduce((s, i) => s + i.quantity, 0)} items · {order.customerName}</div>
            </div>
          </div>
        ),
        { duration: 6000, id: `new-${order.id}` }
      );
    },
    [chime]
  );

  const { orders, upsert, connected, loading } = useStaffOrders({ params: { active: true }, onNewOrder });

  const grouped = useMemo(() => {
    const g = Object.fromEntries(TABS.map((t) => [t.value, []]));
    orders.forEach((o) => {
      const t = TABS.find((x) => x.statuses.includes(o.orderStatus));
      if (t && !(t.value === 'completed' && now - new Date(o.updatedAt).getTime() > 12 * 3600 * 1000)) g[t.value].push(o);
    });
    // Oldest first for active work, newest first for history.
    ['new', 'preparing', 'ready'].forEach((k) => g[k].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
    g.completed.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return g;
  }, [orders, now]);

  // Flash the browser tab title while new orders are waiting.
  const pendingCount = grouped.new.length;
  useEffect(() => {
    document.title = pendingCount ? `(${pendingCount}) New orders · Krishna Dine KDS` : 'Kitchen · Krishna Dine';
    return () => {
      document.title = baseTitle.current;
    };
  }, [pendingCount]);

  const advance = useCallback(
    async (order, status) => {
      setBusy((b) => ({ ...b, [order.id]: status }));
      try {
        const updated = await orderApi.setStatus(order.id, status);
        upsert(updated);
        setFreshIds((f) => {
          const { [order.id]: _drop, ...rest } = f;
          return rest;
        });
      } catch (err) {
        toast.error(errorMessage(err));
        if (err.response?.status === 409) {
          try {
            upsert(await orderApi.get(order.id));
          } catch {
            /* ignore */
          }
        }
      } finally {
        setBusy((b) => {
          const { [order.id]: _drop, ...rest } = b;
          return rest;
        });
      }
    },
    [upsert]
  );

  // Keep ringing every 8 seconds until every new order has been accepted (or cancelled).
  const { play: playChime } = chime;
  useEffect(() => {
    if (!pendingCount) return undefined;
    const id = setInterval(playChime, 8000);
    return () => clearInterval(id);
  }, [pendingCount, playChime]);

  const soundBlocked = !chime.enabled || !chime.unlocked;
  const tabs = TABS.map((t) => ({ ...t, count: grouped[t.value].length }));
  const list = grouped[tab];

  return (
    <KitchenLayout
      connected={connected}
      actions={
        <>
          <Button variant="secondary" size="md" icon={ListChecks} onClick={() => setMenuOpen(true)} className="border-white/20 bg-white/10 text-cream-50 hover:bg-white/15">
            <span className="hidden md:inline">Item availability</span>
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={chime.toggle}
            className={`border-white/20 ${chime.enabled && chime.unlocked ? 'bg-white/10 text-cream-50 hover:bg-white/15' : 'bg-gold-400 text-brand-950 hover:bg-gold-500'}`}
            icon={chime.enabled ? Volume2 : VolumeX}
            data-testid="kds-sound"
          >
            <span className="hidden md:inline">{!chime.enabled ? 'Sound off' : chime.unlocked ? 'Sound on' : 'Tap to enable sound'}</span>
          </Button>
        </>
      }
    >
      <div className="px-4 py-5 lg:px-6">
        {soundBlocked && (
          <button type="button" onClick={chime.enabled ? chime.unlock : chime.toggle} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 px-4 py-3 text-base font-extrabold text-brand-950 shadow-lift" data-testid="sound-banner">
            <VolumeX className="h-5 w-5" /> {chime.enabled ? 'Tap here to turn on the new-order sound alert' : 'Sound is off. Tap to turn it on'}
          </button>
        )}
        <Tabs tabs={tabs} value={tab} onChange={setTab} size="lg" className="mb-5 w-fit max-w-full" />
        {loading ? (
          <Spinner label="Loading orders" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={TABS.find((t) => t.value === tab).icon}
            title={tab === 'new' ? 'No new orders' : `Nothing in ${TABS.find((t) => t.value === tab).label.toLowerCase()}`}
            message={tab === 'new' ? 'New orders will appear here instantly, with a sound alert.' : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((o) => (
              <KitchenOrderCard
                key={o.id}
                order={o}
                now={now}
                busy={busy[o.id]}
                isNew={o.orderStatus === 'pending' && (freshIds[o.id] ? now - freshIds[o.id] < NEW_HIGHLIGHT_MS : now - new Date(o.createdAt).getTime() < NEW_HIGHLIGHT_MS)}
                onAdvance={advance}
                onCancel={setCancelTarget}
              />
            ))}
          </div>
        )}
      </div>
      <CancelOrderDialog order={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={upsert} />
      <MenuAvailabilityDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </KitchenLayout>
  );
}
