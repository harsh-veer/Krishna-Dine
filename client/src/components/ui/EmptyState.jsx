export default function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base font-bold text-brand-950">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-brand-900/60">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
