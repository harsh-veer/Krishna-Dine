import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, ChefHat, KeyRound, LayoutDashboard, LogOut, Menu as MenuIcon, QrCode, ReceiptText, Settings, UtensilsCrossed, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders & billing', icon: ReceiptText },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/tables', label: 'Tables & QR', icon: QrCode },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/staff', label: 'Staff', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full flex-col bg-brand-900 text-cream-50">
      <div className="px-5 py-5">
        <Logo light />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-brand-600 text-white shadow-soft' : 'text-cream-200/80 hover:bg-white/10 hover:text-cream-50'}`
            }
          >
            <n.icon className="h-[18px] w-[18px]" /> {n.label}
          </NavLink>
        ))}
        <div className="my-3 border-t border-white/10" />
        <NavLink to="/kitchen" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gold-400 hover:bg-white/10">
          <ChefHat className="h-[18px] w-[18px]" /> Open kitchen display
        </NavLink>
      </nav>
      <div className="m-3 rounded-2xl bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-400 font-bold text-brand-950">{user?.name?.[0] || 'A'}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user?.name}</div>
            <div className="truncate text-xs text-cream-200/60">{user?.email}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NavLink to="/change-password" className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/15">
            <KeyRound className="h-3.5 w-3.5" /> Password
          </NavLink>
          <button type="button" onClick={logout} className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold hover:bg-white/15">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar />
      </aside>
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-brand-950/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-in">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
          <button type="button" className="absolute right-4 top-4 rounded-xl bg-white p-2" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-cream-300/60 bg-cream-100/80 px-4 py-3 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl p-2 hover:bg-cream-200" aria-label="Open menu">
          <MenuIcon className="h-5 w-5" />
        </button>
        <span className="font-bold">{current?.label || 'Admin'}</span>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-brand-950">{title}</h1>
        {description && <p className="mt-1 text-sm text-brand-900/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
