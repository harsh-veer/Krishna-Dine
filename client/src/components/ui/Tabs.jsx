export default function Tabs({ tabs, value, onChange, className = '', size = 'md' }) {
  const pad = size === 'lg' ? 'px-5 py-3 text-base' : 'px-3.5 py-2 text-sm';
  return (
    <div className={`scrollbar-none flex gap-1 overflow-x-auto rounded-2xl bg-cream-200/70 p-1 ${className}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl font-semibold transition ${pad} ${
            value === t.value ? 'bg-white text-brand-950 shadow-soft' : 'text-brand-900/60 hover:text-brand-900'
          }`}
        >
          {t.icon && <t.icon className="h-4 w-4" />}
          {t.label}
          {t.count !== undefined && (
            <span className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-xs ${value === t.value ? 'bg-brand-900 text-cream-50' : 'bg-cream-300 text-brand-900'}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
