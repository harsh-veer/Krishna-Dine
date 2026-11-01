import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronRight, QrCode, ReceiptText, Search, ShoppingBag, X } from 'lucide-react';
import { CartProvider, useCart } from '../../context/CartContext';
import { publicApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import { createSocket } from '../../services/socket';
import Logo from '../../components/Logo';
import MenuItemCard from './MenuItemCard';
import CartSheet from './CartSheet';
import { Button, EmptyState, FullPageSpinner } from '../../components/ui';
import { formatINR } from '../../utils/format';
import { useDebounce } from '../../hooks/useDebounce';
import { myOrders } from './myOrders';

export default function MenuPage() {
  const { token } = useParams();
  const [table, setTable] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTable(null);
    setError(null);
    publicApi
      .table(token)
      .then(setTable)
      .catch((e) => setError({ status: e.response?.status, message: errorMessage(e) }));
  }, [token]);

  if (error) return <InvalidTable error={error} />;
  if (!table) return <FullPageSpinner label="Finding your table" />;

  return (
    <CartProvider tableToken={token}>
      <TableMenu table={table} tableToken={token} />
    </CartProvider>
  );
}

function InvalidTable({ error }) {
  const disabled = error.status === 410;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-6 text-center">
      <Logo className="mb-10" />
      <div className="card max-w-sm p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <QrCode className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-extrabold">{disabled ? 'Table not taking orders' : error.status === 404 ? 'QR code not recognised' : 'Something went wrong'}</h1>
        <p className="mt-2 text-sm text-brand-900/60">{error.message}</p>
        <p className="mt-4 text-xs text-brand-900/45">Please ask a member of staff for help, or scan the QR code on your table again.</p>
      </div>
    </div>
  );
}

function Welcome({ table, settings, onStart }) {
  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-brand-900 text-cream-50">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-700/60" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-800" />
      <div className="relative flex flex-1 flex-col px-7 pb-10 pt-12">
        <Logo light />
        <div className="mt-auto">
          <span className="chip bg-gold-400 px-3 py-1.5 text-sm text-brand-950">Table {table.tableNumber}</span>
          <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.05]">
            Welcome to<br />
            <span className="text-gold-400">{settings?.restaurantName || 'Krishna Hotel & Restaurant'}</span>
          </h1>
          <p className="mt-4 max-w-xs text-cream-200/80">Browse our pure vegetarian menu and order straight to the kitchen. No app needed.</p>
          <Button variant="gold" size="xl" className="mt-8 w-full" onClick={onStart} data-testid="start-ordering">
            View menu <ChevronRight className="h-5 w-5" />
          </Button>
          <p className="mt-4 text-center text-xs text-cream-200/50">{settings?.address || 'Akbarpur, Uttar Pradesh'}</p>
        </div>
      </div>
    </div>
  );
}

function TableMenu({ table, tableToken }) {
  const navigate = useNavigate();
  const cart = useCart();
  const [menu, setMenu] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const welcomeKey = `kd_welcomed_${tableToken}`;
  const [welcomed, setWelcomed] = useState(() => {
    try {
      return sessionStorage.getItem(welcomeKey) === '1';
    } catch {
      return true;
    }
  });
  const search = useDebounce(query.trim().toLowerCase(), 150);
  const sectionRefs = useRef({});
  const chipRefs = useRef({});
  const recent = myOrders.forTable(tableToken);
  const { syncWithMenu } = cart;

  const loadMenu = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([publicApi.menu(), publicApi.settings()]);
      setMenu(m);
      setSettings(s);
      syncWithMenu(m.items);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, [syncWithMenu]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // Live menu changes (sold out items, price edits) without a refresh.
  useEffect(() => {
    const socket = createSocket();
    socket.on('menu-updated', () => loadMenu());
    return () => socket.close();
  }, [loadMenu]);

  const sections = useMemo(() => {
    if (!menu) return [];
    return menu.categories
      .map((c) => ({
        ...c,
        items: menu.items.filter(
          (i) => i.category === c.id && (!search || i.name.toLowerCase().includes(search) || (i.description || '').toLowerCase().includes(search))
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [menu, search]);

  // Highlight the category chip for the section in view.
  useEffect(() => {
    if (!welcomed || !sections.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat(visible.target.dataset.cat);
      },
      { rootMargin: '-140px 0px -60% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [sections, welcomed]);

  useEffect(() => {
    if (activeCat && chipRefs.current[activeCat]) chipRefs.current[activeCat].scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeCat]);

  const jumpTo = (id) => {
    const el = sectionRefs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 128, behavior: 'smooth' });
  };

  if (!welcomed) {
    return (
      <Welcome
        table={table}
        settings={settings}
        onStart={() => {
          try {
            sessionStorage.setItem(welcomeKey, '1');
          } catch {
            /* ignore */
          }
          setWelcomed(true);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  const onPlaced = ({ order, trackingToken }) => {
    myOrders.add({ id: order.id, token: trackingToken, orderNumber: order.orderNumber, tableToken, tableNumber: table.tableNumber, createdAt: order.createdAt });
    setCartOpen(false);
    navigate(`/order/${order.id}?placed=1`);
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-cream-100 pb-32">
      <header className="sticky top-0 z-30 border-b border-cream-300/60 bg-cream-100/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <Logo subtitle={false} />
          <div className="flex items-center gap-2">
            {recent.length > 0 && (
              <Link to={`/order/${recent[0].id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 text-xs font-bold text-brand-800" data-testid="my-orders">
                <ReceiptText className="h-4 w-4" /> My orders
              </Link>
            )}
            <span className="chip bg-brand-900 px-3 py-1.5 text-sm text-cream-50" data-testid="table-number">
              Table {table.tableNumber}
            </span>
          </div>
        </div>
        <div className="px-4 pb-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-900/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes, e.g. paneer, dosa"
              className="input h-11 rounded-2xl pl-10 pr-10"
              aria-label="Search menu"
              type="search"
            />
            {query && (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-brand-900/50" onClick={() => setQuery('')} aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>
        {!search && sections.length > 0 && (
          <nav className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Menu categories">
            {sections.map((s) => (
              <button
                key={s.id}
                ref={(el) => {
                  chipRefs.current[s.id] = el;
                }}
                type="button"
                onClick={() => jumpTo(s.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  activeCat === s.id ? 'bg-brand-900 text-cream-50' : 'bg-white text-brand-900/75 ring-1 ring-cream-300'
                }`}
              >
                {s.name}
              </button>
            ))}
          </nav>
        )}
      </header>

      {loadError && (
        <div className="m-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {loadError} <button type="button" className="font-bold underline" onClick={loadMenu}>Try again</button>
        </div>
      )}
      {!menu && !loadError && <FullPageSpinner label="Loading menu" />}

      {menu && sections.length === 0 && <EmptyState icon={Search} title="No dishes found" message={search ? `Nothing matches "${query}".` : 'The menu is empty right now.'} />}

      <main className="space-y-7 px-4 pt-4">
        {sections.map((s) => (
          <section
            key={s.id}
            data-cat={s.id}
            ref={(el) => {
              sectionRefs.current[s.id] = el;
            }}
          >
            <div className="mb-3">
              <h2 className="font-display text-2xl font-semibold text-brand-950">{s.name}</h2>
              {s.description && !search && <p className="text-sm text-brand-900/55">{s.description}</p>}
            </div>
            <div className="space-y-3">
              {s.items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
        {menu && <p className="pb-4 pt-2 text-center text-xs text-brand-900/40">All prices in INR, exclusive of GST. 100% vegetarian kitchen.</p>}
      </main>

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full animate-pop items-center justify-between rounded-2xl bg-brand-900 px-5 py-4 text-cream-50 shadow-lift transition active:scale-[0.99]"
            data-testid="view-cart"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <span className="text-left">
                <span className="block text-xs text-cream-200/70">{cart.count} item{cart.count > 1 ? 's' : ''}</span>
                <span className="block font-extrabold">{formatINR(cart.subtotal)} <span className="text-xs font-medium text-cream-200/60">+ GST</span></span>
              </span>
            </span>
            <span className="flex items-center gap-1 font-bold">View cart <ChevronRight className="h-5 w-5" /></span>
          </button>
        </div>
      )}

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} table={table} tableToken={tableToken} settings={settings} onPlaced={onPlaced} />
    </div>
  );
}
