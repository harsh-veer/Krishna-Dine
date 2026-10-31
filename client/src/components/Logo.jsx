export function LogoMark({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0B3B2E" />
      <path d="M32 14c-5 7-7.5 13-7.5 18.5S27.5 44 32 48c4.5-4 7.5-10 7.5-15.5S37 21 32 14z" fill="#F6EFDF" />
      <path d="M18 26c0 9 4.5 17 14 22-4-6-5.5-12-4.8-18.3C24.5 27.5 21.5 26.3 18 26zM46 26c0 9-4.5 17-14 22 4-6 5.5-12 4.8-18.3C39.5 27.5 42.5 26.3 46 26z" fill="#D6B36A" />
    </svg>
  );
}

export default function Logo({ light = false, subtitle = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-10 w-10 shrink-0" />
      <div className="leading-tight">
        <div className={`font-display text-xl font-semibold tracking-tight ${light ? 'text-cream-50' : 'text-brand-950'}`}>
          Krishna <span className={light ? 'text-gold-400' : 'text-brand-600'}>Dine</span>
        </div>
        {subtitle && <div className={`text-[11px] font-medium uppercase tracking-[0.14em] ${light ? 'text-cream-200/70' : 'text-brand-900/50'}`}>Krishna Hotel &amp; Restaurant</div>}
      </div>
    </div>
  );
}
