const TONES = {
  green: 'bg-brand-50 text-brand-700 ring-brand-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  gold: 'bg-cream-200 text-gold-600 ring-cream-400',
  dark: 'bg-brand-900 text-cream-50 ring-brand-900',
};

export default function Badge({ tone = 'slate', className = '', children, icon: Icon }) {
  return (
    <span className={`chip ring-1 ring-inset ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}
