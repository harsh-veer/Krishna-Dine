import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronRight, Leaf, QrCode, Search, ShoppingBag, X } from 'lucide-react';
import { CartProvider, useCart } from '../../context/CartContext';
import { publicApi } from '../../services/endpoints';
import { errorMessage } from '../../services/api';
import { createSocket } from '../../services/socket';
import Logo from '../../components/Logo';
import LanguageToggle from '../../components/LanguageToggle';
import MenuHero from '../../components/MenuHero';
import Reveal from '../../components/Reveal';
import { useI18n } from '../../i18n';
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
  if (!table) return <Finding />;

  return (
    <CartProvider tableToken={token}>
      <TableMenu table={table} tableToken={token} />
    </CartProvider>
  );
}

function Finding() {
  const { t } = useI18n();
  return <FullPageSpinner label={t('menu.finding')} />;
}

function InvalidTable({ error }) {
  const { t } = useI18n();
  const disabled = error.status === 410;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-6 text-center">
      <Logo className="mb-10" />
      <div className="card max-w-sm p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <QrCode className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-extrabold">{disabled ? t('invalid.disabledTitle') : error.status === 404 ? t('invalid.notFoundTitle') : t('invalid.errorTitle')}</h1>
        <p className="mt-2 text-sm text-brand-900/60">{error.message}</p>
        <p className="mt-4 text-xs text-brand-900/45">{t('invalid.help')}</p>
      </div>
    </div>
  );
}

function TableMenu({ table, tableToken }) {
  const { t, pick, lang } = useI18n();
  const navigate = useNavigate();
  const cart = useCart();
  const [menu, setMenu] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
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
          (i) => i.category === c.id && (!search || [i.name, i.nameHi, i.description, i.descriptionHi].some((x) => (x || '').toLowerCase().includes(search)))
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [menu, search]);

  // Highlight the category chip for the section in view.
  useEffect(() => {
    if (!sections.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat(visible.target.dataset.cat);
      },
      { rootMargin: '-140px 0px -60% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  useEffect(() => {
    if (activeCat && chipRefs.current[activeCat]) chipRefs.current[activeCat].scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeCat]);

  const jumpTo = (id) => {
    const el = sectionRefs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 128, behavior: 'smooth' });
  };

  const onPlaced = ({ order, trackingToken }) => {
    myOrders.add({ id: order.id, token: trackingToken, orderNumber: order.orderNumber, tableToken, tableNumber: table.tableNumber, createdAt: order.createdAt });
    setCartOpen(false);
    navigate(`/order/${order.id}?placed=1`);
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-poster pb-32">
      <MenuHero table={table} lastOrderId={recent[0]?.id} />
      <header className="sticky top-0 z-30 mt-3 border-b border-[#EBD5C3] bg-[#F8ECE0]/95 backdrop-blur">
        <div className="px-4 pb-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-900/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('menu.search')}
              className="input h-11 rounded-2xl border-[#EBD5C3] bg-white pl-10 pr-10"
              aria-label={t('menu.search')}
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
                  activeCat === s.id ? 'bg-[#7A4A32] text-[#FFF8F2] shadow-soft' : 'bg-white text-[#4A3026]/80 ring-1 ring-[#EBD5C3]'
                }`}
              >
                {pick(s, 'name')}
              </button>
            ))}
          </nav>
        )}
      </header>

      {loadError && (
        <div className="m-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {loadError} <button type="button" className="font-bold underline" onClick={loadMenu}>{t('common.tryAgain')}</button>
        </div>
      )}
      {!menu && !loadError && <FullPageSpinner label={t('menu.loading')} />}

      {menu && sections.length === 0 && <EmptyState icon={Search} title={t('menu.noDishes')} message={search ? t('menu.noMatch', { q: query }) : t('menu.empty')} />}

      <main className="space-y-7 px-4 pt-4">
        {sections.map((s) => (
          <section
            key={s.id}
            data-cat={s.id}
            ref={(el) => {
              sectionRefs.current[s.id] = el;
            }}
          >
            <div className="mb-3 text-center">
              <h2 className="font-cormorant text-[1.9rem] font-bold tracking-wide text-[#7A4A32]">{pick(s, 'name')}</h2>
              <div className="mx-auto mt-1 flex max-w-[12rem] items-center gap-2 text-[#C99B78]" aria-hidden="true">
                <span className="h-px flex-1 bg-[#E3B994]" />
                <Leaf className="h-3.5 w-3.5" />
                <span className="h-px flex-1 bg-[#E3B994]" />
              </div>
              {s.description && !search && <p className="mt-1.5 font-jost text-sm text-[#4A3026]/65">{s.description}</p>}
            </div>
            <div className="space-y-3">
              {s.items.map((item) => (
                <Reveal key={item.id}>
                  <MenuItemCard item={item} />
                </Reveal>
              ))}
            </div>
          </section>
        ))}
        {menu && (
          <div className="pb-4 pt-4 text-center">
            <div className={`text-[1.7rem] text-[#C4875A] ${lang === 'hi' ? 'font-serif italic' : 'font-script'}`}>{t('poster.footer')}</div>
            <p className="mt-1 font-jost text-xs text-[#4A3026]/55">{t('menu.footer')}</p>
          </div>
        )}
      </main>

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full animate-pop items-center justify-between rounded-2xl bg-[#7A4A32] px-5 py-4 text-[#FFF8F2] shadow-lift ring-1 ring-[#E3B994]/60 transition active:scale-[0.99]"
            data-testid="view-cart"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <span className="text-left">
                <span className="block text-xs text-cream-200/70">{t(cart.count === 1 ? 'menu.item' : 'menu.items', { n: cart.count })}</span>
                <span className="block font-extrabold">{formatINR(cart.subtotal)} <span className="text-xs font-medium text-cream-200/60">+ GST</span></span>
              </span>
            </span>
            <span className="flex items-center gap-1 font-bold">{t('menu.viewCart')} <ChevronRight className="h-5 w-5" /></span>
          </button>
        </div>
      )}

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} table={table} tableToken={tableToken} settings={settings} onPlaced={onPlaced} />
    </div>
  );
}
