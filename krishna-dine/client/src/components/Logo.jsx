import logoUrl from '../assets/logo.png';

/** The Krishna Hotel "KH" mark on a white tile, so the red logo stays readable on dark and light backgrounds. */
export function LogoMark({ className = 'h-10 w-10' }) {
  return (
    <img
      src={logoUrl}
      alt="Krishna Hotel logo"
      className={`${className} shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm ring-1 ring-black/5`}
      draggable="false"
    />
  );
}

export default function Logo({ light = false, subtitle = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-11 w-11" />
      <div className="leading-tight">
        <div className={`font-display text-xl font-semibold tracking-tight ${light ? 'text-cream-50' : 'text-brand-950'}`}>
          Krishna <span className={light ? 'text-gold-400' : 'text-brand-600'}>Dine</span>
        </div>
        {subtitle && <div className={`text-[11px] font-medium uppercase tracking-[0.14em] ${light ? 'text-cream-200/70' : 'text-brand-900/50'}`}>Krishna Hotel &amp; Restaurant</div>}
      </div>
    </div>
  );
}
