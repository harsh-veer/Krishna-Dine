export default function StatCard({ label, value, icon: Icon, hint, tone = 'green' }) {
  const tones = {
    green: 'bg-brand-50 text-brand-700',
    gold: 'bg-cream-200 text-gold-600',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-brand-900/60">{label}</div>
        {Icon && (
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight text-brand-950 tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-brand-900/50">{hint}</div>}
    </div>
  );
}
