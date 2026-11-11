import { Link } from 'react-router-dom';
import { LogOut, Plus, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function WaiterLayout({ connected, children }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-poster">
      <header className="sticky top-0 z-30 bg-brand-900 text-cream-50 shadow-lift">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/waiter" className="flex items-center gap-3">
            <Logo light subtitle={false} />
            <span className="hidden rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-gold-400 sm:inline">Waiter</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {connected !== undefined && (
              <span className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold ${connected ? 'bg-brand-700' : 'bg-red-600 animate-pulse'}`}>
                {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {connected ? 'Live' : 'Reconnecting'}
              </span>
            )}
            <Link to="/waiter/orders/new" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gold-400 px-3 text-sm font-extrabold text-brand-950 hover:bg-gold-500" data-testid="waiter-new-order">
              <Plus className="h-4 w-4" /> New order
            </Link>
            <button type="button" onClick={logout} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-semibold hover:bg-white/15" title={`Signed in as ${user?.name}`}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
