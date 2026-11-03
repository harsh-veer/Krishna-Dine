import { Link } from 'react-router-dom';
import { LayoutDashboard, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function KitchenLayout({ connected, actions, children }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-[#F3EEE2]">
      <header className="sticky top-0 z-30 bg-brand-900 text-cream-50 shadow-lift">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <Logo light subtitle={false} />
            <span className="hidden rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-gold-400 sm:inline">Kitchen display</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <span
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold ${connected ? 'bg-brand-700 text-cream-50' : 'bg-red-600 text-white animate-pulse'}`}
              data-testid="kds-connection"
            >
              {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {connected ? 'Live' : 'Reconnecting'}
            </span>
            {user?.role === 'admin' && (
              <Link to="/admin" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-semibold hover:bg-white/15">
                <LayoutDashboard className="h-4 w-4" /> Admin
              </Link>
            )}
            <button type="button" onClick={logout} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-semibold hover:bg-white/15" title={`Signed in as ${user?.name}`}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
